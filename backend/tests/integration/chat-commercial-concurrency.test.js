
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

// Construir y verificar la configuracion de pruebas
// antes de modificar la variable de entorno.
const testDatabaseUrl = getTestDatabaseUrl();

const prisma = createTestPrisma();

// Los repositorios importados a continuacion
// utilizaran exclusivamente la base de integracion.
process.env.DATABASE_URL = testDatabaseUrl;

const commercialRepository = require(
  '../../src/modules/chat/repositories/commercial.repository'
);

const messageRepository = require(
  '../../src/modules/chat/repositories/commercial-message.repository'
);

async function createFixture() {
  await verifyTestDatabase(prisma);

  const suffix = randomUUID();

  const role = await prisma.role.create({
    data: {
      nombre: `TEST_CHAT_${suffix}`,
    },
  });

  const agent = await prisma.user.create({
    data: {
      nombre: 'Agente',
      apellido: 'Integracion',
      correo: `chat-${suffix}@example.test`,
      password: 'NO_ES_UN_PASSWORD_REAL',
      roleId: role.id,
      activo: true,
    },
  });

  const visitor = await prisma.chatVisitor.create({
    data: {
      nombre: `Visitante ${suffix}`,
    },
  });

  const conversation = await prisma.chatConversation.create({
    data: {
      tipo: 'COMERCIAL',
      estado: 'EN_CURSO',
      assignedAgentId: agent.id,
    },
  });

  const agentParticipant = await prisma.chatParticipant.create({
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
    participantId: agentParticipant.id,
  };
}

async function deleteFixture(fixture) {
  await verifyTestDatabase(prisma);

  await prisma.chatMessage.deleteMany({
    where: {
      conversationId: fixture.conversationId,
    },
  });

  await prisma.chatParticipant.deleteMany({
    where: {
      conversationId: fixture.conversationId,
    },
  });

  await prisma.chatConversation.delete({
    where: {
      id: fixture.conversationId,
    },
  });

  await prisma.chatVisitor.delete({
    where: {
      id: fixture.visitorId,
    },
  });

  await prisma.user.delete({
    where: {
      id: fixture.agentId,
    },
  });

  await prisma.role.delete({
    where: {
      id: fixture.roleId,
    },
  });
}

async function withFixture(callback) {
  const fixture = await createFixture();

  try {
    return await callback(fixture);
  } finally {
    await deleteFixture(fixture);
  }
}

test.before(async () => {
  const database = await verifyTestDatabase(prisma);

  assert.equal(database, TEST_DATABASE);

  const constraints = await prisma.$queryRaw`
    SELECT conname
    FROM pg_constraint
    WHERE conname IN (
      'ChatConversation_private_pair_key_check',
      'ChatParticipant_exactly_one_identity_check'
    )
  `;

  assert.equal(
    constraints.length,
    2,
    'Faltan restricciones CHECK en la base de integracion'
  );
});

test.after(async () => {
  await prisma.$disconnect();

  // El repositorio utiliza otro cliente Prisma compartido.
  const sharedPrisma = require('../../src/config/database');
  await sharedPrisma.$disconnect();
});

test(
  'CH-03.5.4: no permite mensajes despues del cierre',
  async () => {
    await withFixture(async (fixture) => {
      const closed = await commercialRepository.cambiarEstado(
        fixture.conversationId,
        fixture.agentId,
        'EN_CURSO',
        'RESUELTA'
      );

      assert.equal(closed.conversation?.estado, 'RESUELTA');

      const result = await messageRepository.enviarAtomico({
        agentId: fixture.agentId,
        conversationId: fixture.conversationId,
        contenido: 'Mensaje posterior al cierre',
        clientMessageId: randomUUID(),
      });

      assert.deepEqual(result, {
        error: 'RESOLVED',
      });

      const count = await prisma.chatMessage.count({
        where: {
          conversationId: fixture.conversationId,
        },
      });

      assert.equal(count, 0);
    });
  }
);

test(
  'CH-03.5.4: el mensaje confirmado antes del cierre se conserva',
  async () => {
    await withFixture(async (fixture) => {
      const sent = await messageRepository.enviarAtomico({
        agentId: fixture.agentId,
        conversationId: fixture.conversationId,
        contenido: 'Mensaje antes del cierre',
        clientMessageId: randomUUID(),
      });

      assert.equal(sent.creado, true);

      const closed = await commercialRepository.cambiarEstado(
        fixture.conversationId,
        fixture.agentId,
        'EN_CURSO',
        'RESUELTA'
      );

      assert.equal(closed.conversation?.estado, 'RESUELTA');

      const stored = await prisma.chatMessage.findUnique({
        where: {
          id: sent.mensaje.id,
        },
      });

      assert.ok(stored);
      assert.equal(
        stored.contenido,
        'Mensaje antes del cierre'
      );
    });
  }
);

test(
  'CH-03.5.4: dos cierres simultaneos no pueden ganar',
  async () => {
    await withFixture(async (fixture) => {
      const results = await Promise.all([
        commercialRepository.cambiarEstado(
          fixture.conversationId,
          fixture.agentId,
          'EN_CURSO',
          'RESUELTA'
        ),
        commercialRepository.cambiarEstado(
          fixture.conversationId,
          fixture.agentId,
          'EN_CURSO',
          'RESUELTA'
        ),
      ]);

      const successful = results.filter(
        (result) => result.conversation?.estado === 'RESUELTA'
      );

      const conflicts = results.filter(
        (result) => result.error === 'CONFLICT'
      );

      assert.equal(successful.length, 1);
      assert.equal(conflicts.length, 1);

      const conversation =
        await prisma.chatConversation.findUnique({
          where: {
            id: fixture.conversationId,
          },
        });

      assert.equal(conversation.estado, 'RESUELTA');
    });
  }
);

test(
  'CH-03.5.4: dos mensajes simultaneos se almacenan',
  async () => {
    await withFixture(async (fixture) => {
      const results = await Promise.all([
        messageRepository.enviarAtomico({
          agentId: fixture.agentId,
          conversationId: fixture.conversationId,
          contenido: 'Mensaje concurrente A',
          clientMessageId: randomUUID(),
        }),
        messageRepository.enviarAtomico({
          agentId: fixture.agentId,
          conversationId: fixture.conversationId,
          contenido: 'Mensaje concurrente B',
          clientMessageId: randomUUID(),
        }),
      ]);

      assert.equal(results[0].creado, true);
      assert.equal(results[1].creado, true);

      const messages = await prisma.chatMessage.findMany({
        where: {
          conversationId: fixture.conversationId,
        },
      });

      assert.equal(messages.length, 2);

      assert.notEqual(
        messages[0].id,
        messages[1].id
      );
    });
  }
);

test(
  'CH-03.5.4: mensajes concurrentes con el mismo ID son idempotentes',
  async () => {
    await withFixture(async (fixture) => {
      const clientMessageId = randomUUID();

      const results = await Promise.all([
        messageRepository.enviarAtomico({
          agentId: fixture.agentId,
          conversationId: fixture.conversationId,
          contenido: 'Mensaje idempotente',
          clientMessageId,
        }),
        messageRepository.enviarAtomico({
          agentId: fixture.agentId,
          conversationId: fixture.conversationId,
          contenido: 'Mensaje idempotente',
          clientMessageId,
        }),
      ]);

      const created = results.filter(
        (result) => result.creado === true
      );

      const reused = results.filter(
        (result) => result.creado === false
      );

      assert.equal(created.length, 1);
      assert.equal(reused.length, 1);

      assert.equal(
        results[0].mensaje.id,
        results[1].mensaje.id
      );

      const count = await prisma.chatMessage.count({
        where: {
          conversationId: fixture.conversationId,
        },
      });

      assert.equal(count, 1);
    });
  }
);


test(
  'CH-03.5.4: el cierre espera un bloqueo FOR UPDATE',
  async () => {
    await withFixture(async (fixture) => {
      let releaseLock;
      let notifyLocked;

      const lockReleased = new Promise((resolve) => {
        releaseLock = resolve;
      });

      const lockAcquired = new Promise((resolve) => {
        notifyLocked = resolve;
      });

      // Mantener una transaccion abierta con el bloqueo
      // de la conversacion.
      const blocker = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`
            SELECT id
            FROM "ChatConversation"
            WHERE id = ${fixture.conversationId}
            FOR UPDATE
          `;

          notifyLocked();

          await lockReleased;
        },
        {
          timeout: 15000,
          maxWait: 5000,
        }
      );

      let closing;

      try {
        await lockAcquired;

        // Esta operacion debe esperar mientras
        // la primera transaccion mantiene el bloqueo.
        closing = commercialRepository.cambiarEstado(
          fixture.conversationId,
          fixture.agentId,
          'EN_CURSO',
          'RESUELTA'
        );

        let blocked = false;

        // Esperar hasta 5 segundos para observar
        // la espera de bloqueo en PostgreSQL.
        const deadline = Date.now() + 5000;

        while (Date.now() < deadline) {
          const rows = await prisma.$queryRaw`
            SELECT EXISTS (
              SELECT 1
              FROM pg_stat_activity
              WHERE datname = current_database()
                AND wait_event_type = 'Lock'
                AND query LIKE '%ChatConversation%'
            ) AS blocked
          `;

          if (rows[0].blocked) {
            blocked = true;
            break;
          }

          await new Promise((resolve) => {
            setTimeout(resolve, 50);
          });
        }

        assert.equal(
          blocked,
          true,
          'El cierre debe esperar el bloqueo de PostgreSQL'
        );

        // Mientras se mantiene el bloqueo,
        // la conversacion debe seguir EN_CURSO.
        const current = await prisma.chatConversation.findUnique({
          where: {
            id: fixture.conversationId,
          },
          select: {
            estado: true,
          },
        });

        assert.equal(current.estado, 'EN_CURSO');
      } finally {
        // Siempre liberar el bloqueo,
        // incluso cuando una asercion falle.
        releaseLock();

        await blocker;

        if (closing) {
          await closing;
        }
      }

      const stored = await prisma.chatConversation.findUnique({
        where: {
          id: fixture.conversationId,
        },
      });

      assert.equal(stored.estado, 'RESUELTA');
    });
  }
);
