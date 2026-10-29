
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const {
  TEST_DATABASE,
  getTestDatabaseUrl,
  createTestPrisma,
  verifyTestDatabase,
} = require('./test-database');

// Crear el cliente antes de cambiar DATABASE_URL.
// No modificar .env ni conectarse a la base principal.
const testDatabaseUrl = getTestDatabaseUrl();
const prisma = createTestPrisma();

process.env.DATABASE_URL = testDatabaseUrl;

const commercialRepository = require(
  '../../src/modules/chat/repositories/commercial.repository'
);

const agentMessageRepository = require(
  '../../src/modules/chat/repositories/commercial-message.repository'
);

const visitorMessageRepository = require(
  '../../src/modules/chat/repositories/visitor-message.repository'
);

const sharedPrisma = require('../../src/config/database');

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function createFixture() {
  await verifyTestDatabase(prisma);

  const suffix = randomUUID();

  const role = await prisma.role.create({
    data: {
      nombre: `TEST_RACE_${suffix}`,
    },
  });

  const agent = await prisma.user.create({
    data: {
      nombre: 'Agente',
      apellido: 'Concurrencia',
      correo: `race-${suffix}@example.test`,
      password: 'NO_ES_UN_PASSWORD_REAL',
      roleId: role.id,
      activo: true,
    },
  });

  const visitor = await prisma.chatVisitor.create({
    data: {
      nombre: `Visitante ${suffix}`,
      activo: true,
    },
  });

  const conversation = await prisma.chatConversation.create({
    data: {
      tipo: 'COMERCIAL',
      estado: 'EN_CURSO',
      assignedAgentId: agent.id,
    },
  });

  await prisma.chatParticipant.create({
    data: {
      conversationId: conversation.id,
      userId: agent.id,
      rol: 'AGENTE',
    },
  });

  await prisma.chatParticipant.create({
    data: {
      conversationId: conversation.id,
      visitorId: visitor.id,
      rol: 'VISITANTE',
    },
  });

  return {
    roleId: role.id,
    agentId: agent.id,
    visitorId: visitor.id,
    conversationId: conversation.id,
  };
}

async function deleteFixture(fixture) {
  await verifyTestDatabase(prisma);

  await prisma.chatMessage.deleteMany({
    where: { conversationId: fixture.conversationId },
  });

  await prisma.chatParticipant.deleteMany({
    where: { conversationId: fixture.conversationId },
  });

  await prisma.chatConversation.delete({
    where: { id: fixture.conversationId },
  });

  await prisma.chatVisitor.delete({
    where: { id: fixture.visitorId },
  });

  await prisma.user.delete({
    where: { id: fixture.agentId },
  });

  await prisma.role.delete({
    where: { id: fixture.roleId },
  });
}

async function withFixture(callback) {
  const fixture = await createFixture();

  try {
    await callback(fixture);
  } finally {
    await deleteFixture(fixture);
  }
}

function sendMessage(fixture, sender) {
  const data = {
    conversationId: fixture.conversationId,
    contenido: `Mensaje de ${sender}`,
    clientMessageId: randomUUID(),
  };

  if (sender === 'agente') {
    return agentMessageRepository.enviarAtomico({
      ...data,
      agentId: fixture.agentId,
    });
  }

  return visitorMessageRepository.enviarAtomico({
    ...data,
    visitorId: fixture.visitorId,
  });
}

async function waitForBlockedQuery(blockerPid) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    const rows = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity AS activity
        WHERE activity.datname = current_database()
          AND activity.pid <> pg_backend_pid()
          AND ${blockerPid} = ANY(
            pg_blocking_pids(activity.pid)
          )
          AND activity.query LIKE '%ChatConversation%'
      ) AS blocked
    `;

    if (rows[0]?.blocked === true) {
      return;
    }

    await sleep(50);
  }

  assert.fail(
    'No se observo una consulta de ChatConversation ' +
    'bloqueada por la transaccion controlada'
  );
}

async function testCloseFirst(sender) {
  await withFixture(async (fixture) => {
    let releaseLock;
    let notifyReady;

    const released = new Promise((resolve) => {
      releaseLock = resolve;
    });

    const ready = new Promise((resolve) => {
      notifyReady = resolve;
    });

    // La transaccion controlada adquiere el bloqueo
    // y cambia el estado sin confirmar todavia.
    const blocker = prisma.$transaction(
      async (tx) => {
        const pidRows = await tx.$queryRaw`
          SELECT pg_backend_pid() AS pid
        `;

        const blockerPid = pidRows[0].pid;

        await tx.$queryRaw`
          SELECT id
          FROM "ChatConversation"
          WHERE id = ${fixture.conversationId}
          FOR UPDATE
        `;

        await tx.chatConversation.update({
          where: { id: fixture.conversationId },
          data: { estado: 'RESUELTA' },
        });

        notifyReady(blockerPid);

        // El cierre no se confirma hasta que
        // la prueba libere esta espera.
        await released;
      },
      {
        timeout: 15000,
        maxWait: 5000,
      }
    );

    let sending;

    try {
      const blockerPid = await ready;

      // El repositorio real intenta enviar
      // mientras el cierre no esta confirmado.
      sending = sendMessage(fixture, sender);

      await waitForBlockedQuery(blockerPid);

      // Para otras conexiones, el cambio
      // todavia no debe ser visible.
      const current = await prisma.chatConversation.findUnique({
        where: { id: fixture.conversationId },
        select: { estado: true },
      });

      assert.equal(current.estado, 'EN_CURSO');
    } finally {
      // Liberar incluso si falla una comprobacion.
      releaseLock();
      await Promise.allSettled([
        blocker,
        ...(sending ? [sending] : []),
      ]);
    }

    // Comprobar el resultado real de ambas operaciones.
    await blocker;

    const result = await sending;

    assert.deepEqual(result, {
      error: 'RESOLVED',
    });

    const conversation = await prisma.chatConversation.findUnique({
      where: { id: fixture.conversationId },
    });

    assert.equal(conversation.estado, 'RESUELTA');

    const count = await prisma.chatMessage.count({
      where: { conversationId: fixture.conversationId },
    });

    assert.equal(count, 0);
  });
}

async function testMessageFirst(sender) {
  await withFixture(async (fixture) => {
    // El repositorio real confirma primero el mensaje.
    const sent = await sendMessage(fixture, sender);

    assert.equal(sent.creado, true);
    assert.ok(sent.mensaje?.id);

    // Despues se confirma el cierre.
    const closed = await commercialRepository.cambiarEstado(
      fixture.conversationId,
      fixture.agentId,
      'EN_CURSO',
      'RESUELTA'
    );

    assert.equal(closed.conversation?.estado, 'RESUELTA');

    const stored = await prisma.chatMessage.findUnique({
      where: { id: sent.mensaje.id },
    });

    assert.ok(stored);
    assert.equal(stored.id, sent.mensaje.id);

    const count = await prisma.chatMessage.count({
      where: { conversationId: fixture.conversationId },
    });

    assert.equal(count, 1);

    // No debe permitir otro mensaje tras el cierre.
    const later = await sendMessage(fixture, sender);

    assert.deepEqual(later, {
      error: 'RESOLVED',
    });
  });
}

test.before(async () => {
  const database = await verifyTestDatabase(prisma);
  assert.equal(database, TEST_DATABASE);

  const sharedDatabase = await verifyTestDatabase(sharedPrisma);
  assert.equal(sharedDatabase, TEST_DATABASE);
});

test.after(async () => {
  await Promise.all([
    prisma.$disconnect(),
    sharedPrisma.$disconnect(),
  ]);
});

test(
  'CH-03.5.5: cierre primero rechaza mensaje del agente',
  async () => {
    await testCloseFirst('agente');
  }
);

test(
  'CH-03.5.5: cierre primero rechaza mensaje del visitante',
  async () => {
    await testCloseFirst('visitante');
  }
);

test(
  'CH-03.5.5: mensaje del agente antes del cierre se conserva',
  async () => {
    await testMessageFirst('agente');
  }
);

test(
  'CH-03.5.5: mensaje del visitante antes del cierre se conserva',
  async () => {
    await testMessageFirst('visitante');
  }
);
