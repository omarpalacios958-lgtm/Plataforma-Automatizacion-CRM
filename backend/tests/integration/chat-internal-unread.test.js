
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

// Configurar la conexion antes de importar el repositorio.
const testDatabaseUrl = getTestDatabaseUrl();
const prisma = createTestPrisma();

process.env.DATABASE_URL = testDatabaseUrl;

const chatRepository = require(
  '../../src/modules/chat/repositories/chat.repository'
);
const sharedPrisma = require('../../src/config/database');

function fechaRelativa(fecha, segundos) {
  return new Date(fecha.getTime() + segundos * 1000);
}

async function crearFixture() {
  await verifyTestDatabase(prisma);
  await verifyTestDatabase(sharedPrisma);

  const suffix = randomUUID();

  const fixture = {
    roleId: null,
    userIds: [],
    conversationIds: [],
    participants: {},
    messages: {},
  };

  try {
    const role = await prisma.role.create({
      data: { nombre: `TEST_UNREAD_${suffix}` },
    });

    fixture.roleId = role.id;

    for (const nombre of ['Lector', 'Emisor', 'Tercero']) {
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

    const [lectorId, emisorId, terceroId] = fixture.userIds;

    for (const nombre of ['GRUPO_A', 'GRUPO_B']) {
      const conversation = await prisma.chatConversation.create({
        data: {
          tipo: 'INTERNO_GRUPAL',
          estado: 'EN_CURSO',
          nombre: `${nombre}_${suffix}`,
        },
      });

      fixture.conversationIds.push(conversation.id);
    }

    const [grupoA, grupoB] = fixture.conversationIds;

    const emisorA = await prisma.chatParticipant.create({
      data: {
        conversationId: grupoA,
        userId: emisorId,
        rol: 'ADMINISTRADOR',
      },
    });

    const emisorB = await prisma.chatParticipant.create({
      data: {
        conversationId: grupoB,
        userId: terceroId,
        rol: 'ADMINISTRADOR',
      },
    });

    fixture.participants.emisorA = emisorA.id;
    fixture.participants.emisorB = emisorB.id;

    // Historial anterior a la incorporacion del lector.
    const anteriorA = await prisma.chatMessage.create({
      data: {
        conversationId: grupoA,
        participantId: emisorA.id,
        contenido: 'Historial anterior del grupo A',
      },
    });

    const anteriorB = await prisma.chatMessage.create({
      data: {
        conversationId: grupoB,
        participantId: emisorB.id,
        contenido: 'Historial anterior del grupo B',
      },
    });

    // Incorporar al lector despues de crear el historial.
    const lectorA = await prisma.chatParticipant.create({
      data: {
        conversationId: grupoA,
        userId: lectorId,
        rol: 'MIEMBRO',
      },
    });

    const lectorB = await prisma.chatParticipant.create({
      data: {
        conversationId: grupoB,
        userId: lectorId,
        rol: 'MIEMBRO',
      },
    });

    fixture.participants.lectorA = lectorA.id;
    fixture.participants.lectorB = lectorB.id;

    // Fechas explicitas para probar el limite temporal.
    await prisma.chatMessage.update({
      where: { id: anteriorA.id },
      data: {
        createdAt: fechaRelativa(lectorA.createdAt, -60),
      },
    });

    await prisma.chatMessage.update({
      where: { id: anteriorB.id },
      data: {
        createdAt: fechaRelativa(lectorB.createdAt, -60),
      },
    });

    const nuevoA1 = await prisma.chatMessage.create({
      data: {
        conversationId: grupoA,
        participantId: emisorA.id,
        contenido: 'Mensaje recibido A1',
        createdAt: fechaRelativa(lectorA.createdAt, 60),
      },
    });

    const propioA = await prisma.chatMessage.create({
      data: {
        conversationId: grupoA,
        participantId: lectorA.id,
        contenido: 'Mensaje propio',
        createdAt: fechaRelativa(lectorA.createdAt, 120),
      },
    });

    const eliminadoA = await prisma.chatMessage.create({
      data: {
        conversationId: grupoA,
        participantId: emisorA.id,
        contenido: 'Mensaje eliminado',
        createdAt: fechaRelativa(lectorA.createdAt, 180),
        deletedAt: fechaRelativa(lectorA.createdAt, 200),
      },
    });

    const nuevoA2 = await prisma.chatMessage.create({
      data: {
        conversationId: grupoA,
        participantId: emisorA.id,
        contenido: 'Mensaje recibido A2',
        createdAt: fechaRelativa(lectorA.createdAt, 240),
      },
    });

    const nuevoB = await prisma.chatMessage.create({
      data: {
        conversationId: grupoB,
        participantId: emisorB.id,
        contenido: 'Mensaje recibido B',
        createdAt: fechaRelativa(lectorB.createdAt, 60),
      },
    });

    fixture.messages = {
      anteriorA: anteriorA.id,
      anteriorB: anteriorB.id,
      nuevoA1: nuevoA1.id,
      propioA: propioA.id,
      eliminadoA: eliminadoA.id,
      nuevoA2: nuevoA2.id,
      nuevoB: nuevoB.id,
    };

    return fixture;
  } catch (error) {
    await eliminarFixture(fixture);
    throw error;
  }
}

async function eliminarFixture(fixture) {
  await verifyTestDatabase(prisma);

  if (fixture.conversationIds.length > 0) {
    await prisma.chatParticipant.updateMany({
      where: {
        conversationId: { in: fixture.conversationIds },
      },
      data: {
        lastReadMessageId: null,
        lastReadAt: null,
      },
    });

    await prisma.chatMessage.deleteMany({
      where: {
        conversationId: { in: fixture.conversationIds },
      },
    });

    await prisma.chatParticipant.deleteMany({
      where: {
        conversationId: { in: fixture.conversationIds },
      },
    });

    await prisma.chatConversation.deleteMany({
      where: {
        id: { in: fixture.conversationIds },
      },
    });
  }

  if (fixture.userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: fixture.userIds } },
    });
  }

  if (fixture.roleId !== null) {
    await prisma.role.delete({
      where: { id: fixture.roleId },
    });
  }
}

async function conFixture(callback) {
  const fixture = await crearFixture();

  try {
    await callback(fixture);
  } finally {
    await eliminarFixture(fixture);
  }
}

function buscarConversacion(conversaciones, id) {
  const conversacion = conversaciones.find(
    (item) => item.id === id
  );

  assert.ok(conversacion, `No se encontro conversacion ${id}`);

  return conversacion;
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

test(
  'CH-05.6.2.3: cuenta solo mensajes recibidos tras incorporarse',
  async () => {
    await conFixture(async (fixture) => {
      const lectorId = fixture.userIds[0];
      const grupoA = fixture.conversationIds[0];

      const conversaciones =
        await chatRepository.listarConversacionesInternas(lectorId);

      const grupo = buscarConversacion(conversaciones, grupoA);

      // No cuenta el historial anterior, el mensaje propio
      // ni el mensaje eliminado logicamente.
      assert.equal(grupo.unreadCount, 2);
      assert.equal(grupo.lastReadMessageId, null);
      assert.equal(grupo.lastReadAt, null);

      // Los participantes no exponen marcadores privados.
      for (const participante of grupo.participants) {
        assert.equal(
          participante.lastReadMessageId,
          undefined
        );
        assert.equal(
          participante.lastReadAt,
          undefined
        );
      }
    });
  }
);

test(
  'CH-05.6.2.3: actualizar lectura reduce el contador',
  async () => {
    await conFixture(async (fixture) => {
      const lectorId = fixture.userIds[0];
      const grupoA = fixture.conversationIds[0];

      const lectura = await chatRepository.marcarComoLeido({
        conversationId: grupoA,
        participantId: fixture.participants.lectorA,
        messageId: fixture.messages.nuevoA1,
      });

      assert.equal(
        lectura.lastReadMessageId,
        fixture.messages.nuevoA1
      );

      const conversaciones =
        await chatRepository.listarConversacionesInternas(lectorId);

      const grupo = buscarConversacion(conversaciones, grupoA);

      assert.equal(grupo.unreadCount, 1);
      assert.equal(
        grupo.lastReadMessageId,
        fixture.messages.nuevoA1
      );
      assert.ok(grupo.lastReadAt instanceof Date);
    });
  }
);

test(
  'CH-05.6.2.3: mantiene contadores independientes por grupo',
  async () => {
    await conFixture(async (fixture) => {
      const lectorId = fixture.userIds[0];
      const [grupoA, grupoB] = fixture.conversationIds;

      await chatRepository.marcarComoLeido({
        conversationId: grupoA,
        participantId: fixture.participants.lectorA,
        messageId: fixture.messages.nuevoA1,
      });

      const conversaciones =
        await chatRepository.listarConversacionesInternas(lectorId);

      const resultadoA = buscarConversacion(conversaciones, grupoA);
      const resultadoB = buscarConversacion(conversaciones, grupoB);

      assert.equal(resultadoA.unreadCount, 1);
      assert.equal(resultadoB.unreadCount, 1);

      assert.equal(
        resultadoA.lastReadMessageId,
        fixture.messages.nuevoA1
      );
      assert.equal(resultadoB.lastReadMessageId, null);
    });
  }
);

test(
  'CH-05.6.2.3: empleado ajeno no recibe conversaciones',
  async () => {
    await conFixture(async (fixture) => {
      const usuarioAjeno = await prisma.user.create({
        data: {
          nombre: 'Ajeno',
          apellido: 'Integracion',
          correo: `ajeno-${randomUUID()}@example.test`,
          password: 'NO_ES_UN_PASSWORD_REAL',
          roleId: fixture.roleId,
          activo: true,
        },
      });

      fixture.userIds.push(usuarioAjeno.id);

      const conversaciones =
        await chatRepository.listarConversacionesInternas(
          usuarioAjeno.id
        );

      assert.deepEqual(conversaciones, []);
    });
  }
);

test(
  'CH-05.6.2.4: reincorporacion reinicia periodo y mensajes pendientes',
  async () => {
    await conFixture(async (fixture) => {
      const [lectorId, emisorId] = fixture.userIds;
      const grupoA = fixture.conversationIds[0];
      const participanteId = fixture.participants.lectorA;

      const original = await prisma.chatParticipant.findUniqueOrThrow({
        where: { id: participanteId },
      });

      // Establecer un marcador anterior a la salida.
      await chatRepository.marcarComoLeido({
        conversationId: grupoA,
        participantId: participanteId,
        messageId: fixture.messages.nuevoA1,
      });
      // Normalizar las fechas del historial de prueba.
// Los mensajes anteriores deben preceder a la salida real.
const fechaHistorica = fechaRelativa(new Date(), -3600);

await prisma.chatMessage.updateMany({
  where: {
    conversationId: grupoA,
  },
  data: {
    createdAt: fechaHistorica,
  },
});

      // El empleado abandona el grupo.
      const salida = await chatRepository.modificarMembresia({
        conversationId: grupoA,
        actorId: lectorId,
        targetId: lectorId,
        accion: 'SALIR',
      });

      assert.ok(salida.participante);
      assert.ok(salida.participante.leftAt instanceof Date);

      const bandejaFuera =
        await chatRepository.listarConversacionesInternas(lectorId);

      assert.equal(
        bandejaFuera.some((item) => item.id === grupoA),
        false
      );

      // Registrar mensajes durante la ausencia.
      const mensajeAusencia = await prisma.chatMessage.create({
        data: {
          conversationId: grupoA,
          participantId: fixture.participants.emisorA,
          contenido: 'Mensaje enviado durante la ausencia',
          createdAt: fechaRelativa(new Date(), -10),
        },
      });

      // El administrador reincorpora al empleado.
      const reingreso = await chatRepository.modificarMembresia({
        conversationId: grupoA,
        actorId: emisorId,
        targetId: lectorId,
        accion: 'AGREGAR',
      });

      assert.ok(reingreso.participante);
      assert.equal(reingreso.participante.id, participanteId);
      assert.equal(reingreso.participante.leftAt, null);
      assert.equal(reingreso.participante.lastReadMessageId, null);
      assert.equal(reingreso.participante.lastReadAt, null);
      assert.ok(
        reingreso.participante.joinedAt > original.joinedAt
      );

      const bandejaReingreso =
        await chatRepository.listarConversacionesInternas(lectorId);

      assert.equal(
        buscarConversacion(bandejaReingreso, grupoA).unreadCount,
        0
      );

      // Crear un mensaje posterior al reingreso.
      const nuevoMensaje = await prisma.chatMessage.create({
        data: {
          conversationId: grupoA,
          participantId: fixture.participants.emisorA,
          contenido: 'Mensaje posterior al reingreso',
          createdAt: fechaRelativa(
            reingreso.participante.joinedAt,
            60
          ),
        },
      });

      const bandejaConNuevoMensaje =
        await chatRepository.listarConversacionesInternas(lectorId);

      assert.equal(
        buscarConversacion(bandejaConNuevoMensaje, grupoA).unreadCount,
        1
      );

      // Marcar como leído el mensaje nuevo.
      await chatRepository.marcarComoLeido({
        conversationId: grupoA,
        participantId: participanteId,
        messageId: nuevoMensaje.id,
      });

      const bandejaLeida =
        await chatRepository.listarConversacionesInternas(lectorId);

      assert.equal(
        buscarConversacion(bandejaLeida, grupoA).unreadCount,
        0
      );

      // Verificar que los mensajes históricos permanecen almacenados.
      const historial = await prisma.chatMessage.findMany({
        where: {
          id: {
            in: [
              fixture.messages.anteriorA,
              fixture.messages.nuevoA1,
              mensajeAusencia.id,
              nuevoMensaje.id,
            ],
          },
        },
        select: { id: true },
      });

      assert.equal(historial.length, 4);
    });
  }
);