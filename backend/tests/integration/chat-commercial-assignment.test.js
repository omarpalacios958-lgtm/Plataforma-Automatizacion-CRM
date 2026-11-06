
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

// Configurar la base de integración antes de importar
// el repositorio, que utiliza el cliente Prisma compartido.
const testDatabaseUrl = getTestDatabaseUrl();
const prisma = createTestPrisma();

process.env.DATABASE_URL = testDatabaseUrl;

const commercialRepository = require(
  '../../src/modules/chat/repositories/commercial.repository'
);

async function createFixture() {
  await verifyTestDatabase(prisma);

  const suffix = randomUUID();

  const fixture = {
    roleId: null,
    agentIds: [],
    visitorId: null,
    conversationId: null,
  };

  try {
    const role = await prisma.role.create({
      data: {
        nombre: `TEST_CHAT_ASSIGN_${suffix}`,
      },
    });

    fixture.roleId = role.id;

    for (let index = 1; index <= 2; index++) {
      const agent = await prisma.user.create({
        data: {
          nombre: `Agente ${index}`,
          apellido: 'Integracion',
          correo: `chat-assign-${index}-${suffix}@example.test`,
          password: 'NO_ES_UN_PASSWORD_REAL',
          roleId: role.id,
          activo: true,
        },
      });

      fixture.agentIds.push(agent.id);
    }

    const visitor = await prisma.chatVisitor.create({
      data: {
        nombre: `Visitante ${suffix}`,
      },
    });

    fixture.visitorId = visitor.id;

    const conversation = await prisma.chatConversation.create({
      data: {
        tipo: 'COMERCIAL',
        estado: 'PENDIENTE',
        assignedAgentId: null,
      },
    });

    fixture.conversationId = conversation.id;

    await prisma.chatParticipant.create({
      data: {
        conversationId: conversation.id,
        visitorId: visitor.id,
        rol: 'VISITANTE',
      },
    });

    return fixture;
  } catch (error) {
    await deleteFixture(fixture);
    throw error;
  }
}

async function deleteFixture(fixture) {
  await verifyTestDatabase(prisma);

  if (fixture.conversationId !== null) {
    await prisma.chatAssignmentHistory.deleteMany({
      where: {
        conversationId: fixture.conversationId,
      },
    });

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

    await prisma.chatConversation.deleteMany({
      where: {
        id: fixture.conversationId,
      },
    });
  }

  if (fixture.visitorId !== null) {
    await prisma.chatVisitor.deleteMany({
      where: {
        id: fixture.visitorId,
      },
    });
  }

  if (fixture.agentIds.length > 0) {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: fixture.agentIds,
        },
      },
    });
  }

  if (fixture.roleId !== null) {
    await prisma.role.deleteMany({
      where: {
        id: fixture.roleId,
      },
    });
  }
}

test.before(async () => {
  const database = await verifyTestDatabase(prisma);
  assert.equal(database, TEST_DATABASE);
});

test.after(async () => {
  await prisma.$disconnect();

  const sharedPrisma = require('../../src/config/database');
  await sharedPrisma.$disconnect();
});

test(
  'CH-VAL-01.2.5: solo un agente gana la asignacion concurrente',
  async () => {
    const fixture = await createFixture();

    try {
      const [agentA, agentB] = fixture.agentIds;

      const results = await Promise.allSettled([
        commercialRepository.asignar(
          fixture.conversationId,
          agentA
        ),
        commercialRepository.asignar(
          fixture.conversationId,
          agentB
        ),
      ]);

      // Ambas operaciones deben finalizar sin errores
      // inesperados de transaccion o conexion.
      for (const result of results) {
        assert.equal(
          result.status,
          'fulfilled',
          result.status === 'rejected'
            ? String(result.reason)
            : undefined
        );
      }

      const responses = results.map(result => result.value);

      const successful = responses.filter(
        result => result.conversation
      );

      const conflicts = responses.filter(
        result => result.error === 'CONFLICT'
      );

      assert.equal(successful.length, 1);
      assert.equal(conflicts.length, 1);

      const conversation =
        await prisma.chatConversation.findUnique({
          where: {
            id: fixture.conversationId,
          },
        });

      assert.equal(conversation.estado, 'ASIGNADA');

      assert.ok(
        fixture.agentIds.includes(
          conversation.assignedAgentId
        )
      );

      const participants =
        await prisma.chatParticipant.findMany({
          where: {
            conversationId: fixture.conversationId,
            rol: 'AGENTE',
            leftAt: null,
          },
        });

      assert.equal(participants.length, 1);

      assert.equal(
        participants[0].userId,
        conversation.assignedAgentId
      );

      const history =
        await prisma.chatAssignmentHistory.findMany({
          where: {
            conversationId: fixture.conversationId,
          },
        });

      assert.equal(history.length, 1);

      assert.equal(history[0].fromAgentId, null);

      assert.equal(
        history[0].toAgentId,
        conversation.assignedAgentId
      );

      assert.equal(
        history[0].changedByUserId,
        conversation.assignedAgentId
      );

      // Un nuevo intento no debe modificar la asignacion
      // ni crear otro registro de historial.
      const retry = await commercialRepository.asignar(
        fixture.conversationId,
        conversation.assignedAgentId
      );

      assert.equal(retry.error, 'CONFLICT');

      const historyAfterRetry =
        await prisma.chatAssignmentHistory.count({
          where: {
            conversationId: fixture.conversationId,
          },
        });

      assert.equal(historyAfterRetry, 1);
    } finally {
      await deleteFixture(fixture);
    }
  }
);
