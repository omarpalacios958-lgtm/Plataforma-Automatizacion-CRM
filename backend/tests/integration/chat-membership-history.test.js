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

// Aislar la base antes de importar el repositorio y su cliente compartido.
const testDatabaseUrl = getTestDatabaseUrl();
const prisma = createTestPrisma();
process.env.DATABASE_URL = testDatabaseUrl;

const chatRepository = require('../../src/modules/chat/repositories/chat.repository');
const sharedPrisma = require('../../src/config/database');

const desplazar = (fecha, segundos) => new Date(fecha.getTime() + segundos * 1000);

function ids(resultado) {
  const mensajes = resultado?.messages;
  assert.ok(Array.isArray(mensajes), 'La consulta debe devolver messages como lista');
  return mensajes.map((mensaje) => mensaje.id);
}

async function eliminarFixture(fixture) {
  await verifyTestDatabase(prisma);
  if (fixture.conversationIds.length) {
    await prisma.chatParticipant.updateMany({
      where: { conversationId: { in: fixture.conversationIds } },
      data: { lastReadMessageId: null, lastReadAt: null },
    });
    await prisma.chatMessage.deleteMany({
      where: { conversationId: { in: fixture.conversationIds } },
    });
    await prisma.chatParticipant.deleteMany({
      where: { conversationId: { in: fixture.conversationIds } },
    });
    await prisma.chatConversation.deleteMany({
      where: { id: { in: fixture.conversationIds } },
    });
  }
  if (fixture.userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: fixture.userIds } } });
  }
  if (fixture.roleId !== null) {
    await prisma.role.delete({ where: { id: fixture.roleId } });
  }
}

async function crearFixture(tipo = 'INTERNO_GRUPAL') {
  await verifyTestDatabase(prisma);
  await verifyTestDatabase(sharedPrisma);
  const suffix = randomUUID();
  const fixture = { roleId: null, userIds: [], conversationIds: [], participants: {} };
  try {
    const role = await prisma.role.create({
      data: { nombre: `TEST_HISTORIAL_${suffix}` },
    });
    fixture.roleId = role.id;

    for (const nombre of ['Lector', 'Emisor']) {
      const user = await prisma.user.create({
        data: {
          nombre,
          apellido: 'Integracion',
          correo: `${nombre.toLowerCase()}-${suffix}@example.test`,
          password: 'NO_ES_UN_PASSWORD_REAL',
          roleId: role.id,
          activo: true,
        },
      });
      fixture.userIds.push(user.id);
    }

    const [lectorId, emisorId] = fixture.userIds;
    const conversation = await prisma.chatConversation.create({
      data: {
        tipo,
        estado: 'EN_CURSO',
        ...(tipo === 'INTERNO_GRUPAL'
          ? { nombre: `GRUPO_HISTORIAL_${suffix}` }
          : { privatePairKey: `${Math.min(lectorId, emisorId)}:${Math.max(lectorId, emisorId)}` }),
      },
    });
    fixture.conversationIds.push(conversation.id);

    const emisor = await prisma.chatParticipant.create({
      data: {
        conversationId: conversation.id,
        userId: emisorId,
        rol: 'ADMINISTRADOR',
      },
    });
    fixture.participants.emisorId = emisor.id;

    const anterior = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        participantId: emisor.id,
        contenido: 'Mensaje anterior al ingreso',
      },
    });

    const lector = await prisma.chatParticipant.create({
      data: {
        conversationId: conversation.id,
        userId: lectorId,
        rol: 'MIEMBRO',
      },
    });
    fixture.participants.lectorId = lector.id;

    await prisma.chatMessage.update({
      where: { id: anterior.id },
      data: { createdAt: desplazar(lector.joinedAt, -60) },
    });

    const exacto = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        participantId: emisor.id,
        contenido: 'Mensaje en instante de ingreso',
        createdAt: lector.joinedAt,
      },
    });
    const posterior1 = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        participantId: emisor.id,
        contenido: 'Mensaje posterior 1',
        createdAt: desplazar(lector.joinedAt, 60),
      },
    });
    const posterior2 = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        participantId: emisor.id,
        contenido: 'Mensaje posterior 2',
        createdAt: desplazar(lector.joinedAt, 120),
      },
    });

    return {
      fixture,
      conversationId: conversation.id,
      lectorId,
      emisorId,
      lector,
      anterior,
      exacto,
      posterior1,
      posterior2,
    };
  } catch (error) {
    await eliminarFixture(fixture);
    throw error;
  }
}

async function conFixture(tipo, callback) {
  const datos = await crearFixture(tipo);
  try {
    await callback(datos);
  } finally {
    await eliminarFixture(datos.fixture);
  }
}

function consultar(conversationId, userId, pagina = {}) {
  return chatRepository.listarMensajesInternos({
    conversationId,
    userId,
    cursor: null,
    limit: 20,
    ...pagina,
  });
}

test.before(async () => {
  assert.equal(await verifyTestDatabase(prisma), TEST_DATABASE);
  assert.equal(await verifyTestDatabase(sharedPrisma), TEST_DATABASE);
});

test.after(async () => {
  await Promise.all([prisma.$disconnect(), sharedPrisma.$disconnect()]);
});

test('CH-VAL-02.1-H01-TI01: grupo excluye historial anterior e instante de ingreso', async () => {
  await conFixture('INTERNO_GRUPAL', async (datos) => {
    const encontrados = ids(await consultar(datos.conversationId, datos.lectorId));
    assert.deepEqual(encontrados, [datos.posterior2.id, datos.posterior1.id]);
    assert.ok(!encontrados.includes(datos.anterior.id));
    assert.ok(!encontrados.includes(datos.exacto.id));
  });
});

test('CH-VAL-02.1-H01-TI01: reincorporacion y paginacion no exponen historial', async () => {
  await conFixture('INTERNO_GRUPAL', async (datos) => {
    // Todos los mensajes existentes deben preceder a la salida real.
    await prisma.chatMessage.updateMany({
      where: { conversationId: datos.conversationId },
      data: { createdAt: desplazar(new Date(), -3600) },
    });

    await chatRepository.modificarMembresia({
      conversationId: datos.conversationId,
      actorId: datos.lectorId,
      targetId: datos.lectorId,
      accion: 'SALIR',
    });
    const duranteAusencia = await prisma.chatMessage.create({
      data: {
        conversationId: datos.conversationId,
        participantId: datos.fixture.participants.emisorId,
        contenido: 'Durante ausencia',
        createdAt: desplazar(new Date(), -10),
      },
    });
    const reingreso = await chatRepository.modificarMembresia({
      conversationId: datos.conversationId,
      actorId: datos.emisorId,
      targetId: datos.lectorId,
      accion: 'AGREGAR',
    });
    assert.ok(reingreso.participante.joinedAt > datos.lector.joinedAt);

    const nuevo1 = await prisma.chatMessage.create({
      data: {
        conversationId: datos.conversationId,
        participantId: datos.fixture.participants.emisorId,
        contenido: 'Nuevo tras reincorporacion 1',
        createdAt: desplazar(reingreso.participante.joinedAt, 60),
      },
    });
    const nuevo2 = await prisma.chatMessage.create({
      data: {
        conversationId: datos.conversationId,
        participantId: datos.fixture.participants.emisorId,
        contenido: 'Nuevo tras reincorporacion 2',
        createdAt: desplazar(reingreso.participante.joinedAt, 120),
      },
    });

    assert.deepEqual(
      ids(await consultar(datos.conversationId, datos.lectorId)),
      [nuevo2.id, nuevo1.id]
    );
    assert.deepEqual(
      ids(await consultar(datos.conversationId, datos.lectorId, { cursor: nuevo2.id, limit: 10 })),
      [nuevo1.id]
    );
    assert.deepEqual(
      ids(await consultar(datos.conversationId, datos.lectorId, { afterId: 0 })),
      [nuevo1.id, nuevo2.id]
    );
    assert.deepEqual(
      ids(await consultar(datos.conversationId, datos.lectorId, { afterId: duranteAusencia.id })),
      [nuevo1.id, nuevo2.id]
    );
  });
});

test('CH-VAL-02.1-H01-TI01: empleado retirado no puede consultar', async () => {
  await conFixture('INTERNO_GRUPAL', async (datos) => {
    await chatRepository.modificarMembresia({
      conversationId: datos.conversationId,
      actorId: datos.lectorId,
      targetId: datos.lectorId,
      accion: 'SALIR',
    });
    const resultado = await consultar(datos.conversationId, datos.lectorId);
    assert.equal(resultado.error, 'PARTICIPANT_NOT_FOUND');
  });
});

test('CH-VAL-02.1-H01-TI01: privado conserva historial anterior al ingreso', async () => {
  await conFixture('INTERNO_PRIVADO', async (datos) => {
    assert.deepEqual(
      ids(await consultar(datos.conversationId, datos.lectorId)),
      [datos.posterior2.id, datos.posterior1.id, datos.exacto.id, datos.anterior.id]
    );
  });
});
