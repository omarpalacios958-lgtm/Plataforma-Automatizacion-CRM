
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

// Configurar la base de integracion antes de importar el repositorio.
const testDatabaseUrl = getTestDatabaseUrl();
const prisma = createTestPrisma();

process.env.DATABASE_URL = testDatabaseUrl;

const chatRepository = require(
  '../../src/modules/chat/repositories/chat.repository'
);
const sharedPrisma = require('../../src/config/database');

async function createFixture() {
  await verifyTestDatabase(prisma);

  const suffix = randomUUID();

  const role = await prisma.role.create({
    data: { nombre: `TEST_READ_${suffix}` },
  });

  const user = await prisma.user.create({
    data: {
      nombre: 'Empleado',
      apellido: 'Lectura',
      correo: `read-${suffix}@example.test`,
      password: 'NO_ES_UN_PASSWORD_REAL',
      roleId: role.id,
      activo: true,
    },
  });

  const conversation = await prisma.chatConversation.create({
    data: {
      tipo: 'INTERNO_PRIVADO',
      estado: 'EN_CURSO',
      privatePairKey: `TEST_READ_${suffix}`,
    },
  });

  const participant = await prisma.chatParticipant.create({
    data: {
      conversationId: conversation.id,
      userId: user.id,
      rol: 'MIEMBRO',
    },
  });

  const messages = [];

  for (let i = 0; i < 3; i++) {
    const message = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        participantId: participant.id,
        contenido: `Mensaje de prueba ${i + 1}`,
      },
    });

    messages.push(message);
  }

  return {
    roleId: role.id,
    userId: user.id,
    conversationId: conversation.id,
    participantId: participant.id,
    messages,
  };
}

async function deleteFixture(fixture) {
  await verifyTestDatabase(prisma);

  // Eliminar primero las referencias al marcador.
  await prisma.chatParticipant.updateMany({
    where: { conversationId: fixture.conversationId },
    data: {
      lastReadMessageId: null,
      lastReadAt: null,
    },
  });

  await prisma.chatMessage.deleteMany({
    where: { conversationId: fixture.conversationId },
  });

  await prisma.chatParticipant.deleteMany({
    where: { conversationId: fixture.conversationId },
  });

  await prisma.chatConversation.delete({
    where: { id: fixture.conversationId },
  });

  await prisma.user.delete({
    where: { id: fixture.userId },
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

function mark(fixture, messageId) {
  return chatRepository.marcarComoLeido({
    conversationId: fixture.conversationId,
    participantId: fixture.participantId,
    messageId,
  });
}

test.before(async () => {
  assert.equal(
    await verifyTestDatabase(prisma),
    TEST_DATABASE
  );

  assert.equal(
    await verifyTestDatabase(sharedPrisma),
    TEST_DATABASE
  );
});

test.after(async () => {
  await Promise.all([
    prisma.$disconnect(),
    sharedPrisma.$disconnect(),
  ]);
});

test('CH-05.6.2.2: avanza y persiste el marcador', async () => {
  await withFixture(async (fixture) => {
    const messageId = fixture.messages[0].id;
    const result = await mark(fixture, messageId);

    assert.equal(result.conversationId, fixture.conversationId);
    assert.equal(result.lastReadMessageId, messageId);
    assert.ok(result.lastReadAt instanceof Date);

    const stored = await prisma.chatParticipant.findUnique({
      where: { id: fixture.participantId },
    });

    assert.equal(stored.lastReadMessageId, messageId);
    assert.ok(stored.lastReadAt instanceof Date);
  });
});

test('CH-05.6.2.2: reintentos no cambian el marcador', async () => {
  await withFixture(async (fixture) => {
    const first = await mark(fixture, fixture.messages[1].id);
    const repeated = await mark(fixture, fixture.messages[1].id);
    const older = await mark(fixture, fixture.messages[0].id);

    assert.equal(
      repeated.lastReadMessageId,
      fixture.messages[1].id
    );
    assert.equal(
      older.lastReadMessageId,
      fixture.messages[1].id
    );

    assert.equal(
      repeated.lastReadAt.getTime(),
      first.lastReadAt.getTime()
    );
    assert.equal(
      older.lastReadAt.getTime(),
      first.lastReadAt.getTime()
    );
  });
});

test('CH-05.6.2.2: rechaza mensaje de otra conversacion', async () => {
  await withFixture(async (fixture) => {
    const other = await prisma.chatConversation.create({
      data: {
        tipo: 'INTERNO_GRUPAL',
        estado: 'EN_CURSO',
        nombre: `TEST_OTHER_${randomUUID()}`,
      },
    });

    try {
      const otherParticipant = await prisma.chatParticipant.create({
        data: {
          conversationId: other.id,
          userId: fixture.userId,
          rol: 'MIEMBRO',
        },
      });

      const otherMessage = await prisma.chatMessage.create({
        data: {
          conversationId: other.id,
          participantId: otherParticipant.id,
          contenido: 'Mensaje ajeno',
        },
      });

      const result = await mark(fixture, otherMessage.id);

      assert.deepEqual(result, {
        error: 'MESSAGE_NOT_FOUND',
      });

      const stored = await prisma.chatParticipant.findUnique({
        where: { id: fixture.participantId },
      });

      assert.equal(stored.lastReadMessageId, null);
    } finally {
      await prisma.chatMessage.deleteMany({
        where: { conversationId: other.id },
      });
      await prisma.chatParticipant.deleteMany({
        where: { conversationId: other.id },
      });
      await prisma.chatConversation.delete({
        where: { id: other.id },
      });
    }
  });
});

test('CH-05.6.2.2: rechaza participante inactivo', async () => {
  await withFixture(async (fixture) => {
    await prisma.chatParticipant.update({
      where: { id: fixture.participantId },
      data: { leftAt: new Date() },
    });

    const result = await mark(fixture, fixture.messages[0].id);

    assert.deepEqual(result, {
      error: 'PARTICIPANT_NOT_FOUND',
    });
  });
});

test('CH-05.6.2.2: solicitudes concurrentes no retroceden', async () => {
  await withFixture(async (fixture) => {
    const ids = fixture.messages.map((message) => message.id);

    const results = await Promise.all(
      [ids[2], ids[0], ids[1], ids[2], ids[0]].map(
        (messageId) => mark(fixture, messageId)
      )
    );

    const stored = await prisma.chatParticipant.findUnique({
      where: { id: fixture.participantId },
    });

    assert.equal(stored.lastReadMessageId, ids[2]);

    for (const result of results) {
      assert.ok(
        result.lastReadMessageId <= ids[2]
      );
    }
  });
});


const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitForBlockedRead(blockerPid) {
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
          AND activity.query LIKE '%ChatParticipant%'
      ) AS blocked
    `;

    if (rows[0]?.blocked === true) {
      return;
    }

    await sleep(50);
  }

  assert.fail(
    'No se observo una consulta de ChatParticipant ' +
    'bloqueada por la transaccion controlada'
  );
}

test(
  'CH-05.6.2.2: salida confirmada primero rechaza lectura pendiente',
  async () => {
    await withFixture(async (fixture) => {
      let releaseLock;
      let notifyReady;

      const released = new Promise((resolve) => {
        releaseLock = resolve;
      });

      const ready = new Promise((resolve) => {
        notifyReady = resolve;
      });

      const blocker = prisma.$transaction(
        async (tx) => {
          const pidRows = await tx.$queryRaw`
            SELECT pg_backend_pid() AS pid
          `;

          const blockerPid = pidRows[0].pid;

          await tx.$queryRaw`
            SELECT id
            FROM "ChatParticipant"
            WHERE id = ${fixture.participantId}
            FOR UPDATE
          `;

          await tx.chatParticipant.update({
            where: { id: fixture.participantId },
            data: { leftAt: new Date() },
          });

          notifyReady(blockerPid);
          await released;
        },
        {
          timeout: 15000,
          maxWait: 5000,
        }
      );

      let reading;

      try {
        const blockerPid = await ready;

        reading = mark(fixture, fixture.messages[0].id);

        await waitForBlockedRead(blockerPid);

        const current = await prisma.chatParticipant.findUnique({
          where: { id: fixture.participantId },
          select: { leftAt: true },
        });

        assert.equal(current.leftAt, null);
      } finally {
        releaseLock();

        await Promise.allSettled([
          blocker,
          ...(reading ? [reading] : []),
        ]);
      }

      await blocker;

      const result = await reading;

      assert.deepEqual(result, {
        error: 'PARTICIPANT_NOT_FOUND',
      });

      const stored = await prisma.chatParticipant.findUnique({
        where: { id: fixture.participantId },
      });

      assert.ok(stored.leftAt instanceof Date);
      assert.equal(stored.lastReadMessageId, null);
      assert.equal(stored.lastReadAt, null);
    });
  }
);

test(
  'CH-05.6.2.2: lectura confirmada primero se conserva tras salir',
  async () => {
    await withFixture(async (fixture) => {
      const messageId = fixture.messages[1].id;

      const read = await mark(fixture, messageId);

      assert.equal(read.lastReadMessageId, messageId);

      await prisma.chatParticipant.update({
        where: { id: fixture.participantId },
        data: { leftAt: new Date() },
      });

      const stored = await prisma.chatParticipant.findUnique({
        where: { id: fixture.participantId },
      });

      assert.ok(stored.leftAt instanceof Date);
      assert.equal(stored.lastReadMessageId, messageId);
      assert.ok(stored.lastReadAt instanceof Date);

      const later = await mark(
        fixture,
        fixture.messages[2].id
      );

      assert.deepEqual(later, {
        error: 'PARTICIPANT_NOT_FOUND',
      });

      const finalState = await prisma.chatParticipant.findUnique({
        where: { id: fixture.participantId },
      });

      assert.equal(finalState.lastReadMessageId, messageId);
    });
  }
);

test(
  'CH-05.6.2.4: rechaza mensajes anteriores o iguales a joinedAt',
  async () => {
    await withFixture(async (fixture) => {
      const [anterior, igual, posterior] = fixture.messages;

      const fechaBase = new Date('2026-11-03T12:00:00.000Z');

      const fechaAnterior = new Date(
        fechaBase.getTime() - 1000
      );

      const fechaPosterior = new Date(
        fechaBase.getTime() + 1000
      );

      await prisma.chatMessage.update({
        where: { id: anterior.id },
        data: { createdAt: fechaAnterior },
      });

      await prisma.chatMessage.update({
        where: { id: igual.id },
        data: { createdAt: fechaBase },
      });

      await prisma.chatMessage.update({
        where: { id: posterior.id },
        data: { createdAt: fechaPosterior },
      });

      await prisma.chatParticipant.update({
        where: { id: fixture.participantId },
        data: {
          joinedAt: fechaBase,
          lastReadMessageId: null,
          lastReadAt: null,
        },
      });

      for (const messageId of [anterior.id, igual.id]) {
        const resultado = await mark(fixture, messageId);

        assert.deepEqual(resultado, {
          error: 'MESSAGE_NOT_FOUND',
        });

        const participante = await prisma.chatParticipant.findUnique({
          where: { id: fixture.participantId },
        });

        assert.equal(participante.lastReadMessageId, null);
        assert.equal(participante.lastReadAt, null);
      }

      const lecturaValida = await mark(fixture, posterior.id);

      assert.equal(
        lecturaValida.lastReadMessageId,
        posterior.id
      );

      assert.ok(lecturaValida.lastReadAt instanceof Date);

      const mensajesConservados = await prisma.chatMessage.count({
        where: {
          conversationId: fixture.conversationId,
          id: {
            in: [anterior.id, igual.id, posterior.id],
          },
        },
      });

      assert.equal(mensajesConservados, 3);
    });
  }
);

test(
  'CH-05.6.2.4: reincorporacion impide marcar mensajes historicos',
  async () => {
    await withFixture(async (fixture) => {
      const mensajeHistorico = fixture.messages[0];

      // Garantizar que el mensaje preceda al nuevo periodo.
      const fechaHistorica = new Date(
        Date.now() - 60_000
      );

      await prisma.chatMessage.update({
        where: { id: mensajeHistorico.id },
        data: { createdAt: fechaHistorica },
      });

      await prisma.chatParticipant.update({
        where: { id: fixture.participantId },
        data: { leftAt: new Date() },
      });

      // Simular la reincorporacion con las mismas
      // actualizaciones que realiza modificarMembresia.
      const reincorporado = await prisma.chatParticipant.update({
        where: { id: fixture.participantId },
        data: {
          leftAt: null,
          joinedAt: new Date(),
          rol: 'MIEMBRO',
          lastReadMessageId: null,
          lastReadAt: null,
        },
      });

      assert.ok(
        reincorporado.joinedAt > fechaHistorica
      );

      const lecturaHistorica = await mark(
        fixture,
        mensajeHistorico.id
      );

      assert.deepEqual(lecturaHistorica, {
        error: 'MESSAGE_NOT_FOUND',
      });

      const sinLectura = await prisma.chatParticipant.findUnique({
        where: { id: fixture.participantId },
      });

      assert.equal(sinLectura.lastReadMessageId, null);
      assert.equal(sinLectura.lastReadAt, null);

      // Crear un mensaje posterior al nuevo joinedAt.
      const mensajeNuevo = await prisma.chatMessage.create({
        data: {
          conversationId: fixture.conversationId,
          participantId: fixture.participantId,
          contenido: 'Mensaje posterior a reincorporacion',
          createdAt: new Date(
            reincorporado.joinedAt.getTime() + 1000
          ),
        },
      });

      const lecturaNueva = await mark(
        fixture,
        mensajeNuevo.id
      );

      assert.equal(
        lecturaNueva.lastReadMessageId,
        mensajeNuevo.id
      );

      assert.ok(lecturaNueva.lastReadAt instanceof Date);

      const historicoConservado = await prisma.chatMessage.findUnique({
        where: { id: mensajeHistorico.id },
      });

      assert.ok(historicoConservado);
      assert.equal(
        historicoConservado.conversationId,
        fixture.conversationId
      );
    });
  }
);