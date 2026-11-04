'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const repositoryPath = require.resolve(
  '../src/modules/chat/repositories/chat.repository'
);
const databasePath = require.resolve('../src/config/database');

function cargarRepositorio(prismaMock) {
  const databaseAnterior = require.cache[databasePath];
  const repositoryAnterior = require.cache[repositoryPath];

  const moduloDatabase = new Module(databasePath);
  moduloDatabase.filename = databasePath;
  moduloDatabase.loaded = true;
  moduloDatabase.exports = prismaMock;

  require.cache[databasePath] = moduloDatabase;
  delete require.cache[repositoryPath];

  try {
    return require(repositoryPath);
  } finally {
    if (databaseAnterior) {
      require.cache[databasePath] = databaseAnterior;
    } else {
      delete require.cache[databasePath];
    }

    if (repositoryAnterior) {
      require.cache[repositoryPath] = repositoryAnterior;
    } else {
      delete require.cache[repositoryPath];
    }
  }
}

function crearConversacion({
  id,
  userId = 1,
  participantId,
  createdAt,
  joinedAt = createdAt,
  lastReadMessageId = null,
  lastReadAt = null,
}) {
  return {
    id,
    tipo: 'INTERNO_GRUPAL',
    estado: 'EN_CURSO',
    nombre: `Grupo ${id}`,
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    updatedAt: new Date('2026-11-01T10:00:00.000Z'),
    participants: [
      {
        id: participantId,
        userId,
        rol: 'MIEMBRO',
        createdAt: new Date(createdAt),
        joinedAt: new Date(joinedAt),
        lastReadMessageId,
        lastReadAt,
        user: {
          id: userId,
          nombre: 'Empleado',
          apellido: 'Prueba',
        },
      },
    ],
  };
}

function crearEscenario(conversations, mensajes) {
  const consultas = {
    conversations: null,
    messages: null,
  };

  const repository = cargarRepositorio({
    chatParticipant: {
      findMany: async (args) => {
        const ids = args.where.conversationId.in;

        return conversations
          .filter((conversacion) => ids.includes(conversacion.id))
          .flatMap((conversacion) =>
            conversacion.participants
              .filter(
                (participante) =>
                  participante.userId === args.where.userId
              )
              .map((participante) => ({
  id: participante.id,
  conversationId: conversacion.id,
  joinedAt: participante.joinedAt,
  lastReadMessageId: participante.lastReadMessageId,
  lastReadAt: participante.lastReadAt,
}))
          );
      },
    },

    chatConversation: {
      findMany: async (args) => {
        consultas.conversations = args;

        return conversations.map((conversacion) => ({
          id: conversacion.id,
          tipo: conversacion.tipo,
          estado: conversacion.estado,
          nombre: conversacion.nombre,
          createdAt: conversacion.createdAt,
          updatedAt: conversacion.updatedAt,
          participants: conversacion.participants.map(
            (participante) => ({
              id: participante.id,
              userId: participante.userId,
              rol: participante.rol,
              user: participante.user,
            })
          ),
        }));
      },
    },

    chatMessage: {
      groupBy: async (args) => {
        consultas.messages = args;

        const resultados = new Map();

        for (const mensaje of mensajes) {
          const cumple = args.where.OR.some((filtro) => {
            if (mensaje.conversationId !== filtro.conversationId) {
              return false;
            }

            if (
              filtro.id?.gt !== undefined &&
              mensaje.id <= filtro.id.gt
            ) {
              return false;
            }

            if (
              filtro.createdAt?.gt !== undefined &&
              mensaje.createdAt <= filtro.createdAt.gt
            ) {
              return false;
            }

            if (mensaje.deletedAt !== null) {
              return false;
            }

            const excludedParticipantId =
              filtro.participantId?.not;

            if (mensaje.participantId === excludedParticipantId) {
              return false;
            }

            return true;
          });

          if (cumple) {
            resultados.set(
              mensaje.conversationId,
              (resultados.get(mensaje.conversationId) || 0) + 1
            );
          }
        }

        return Array.from(resultados, ([conversationId, count]) => ({
          conversationId,
          _count: { _all: count },
        }));
      },
    },
  });

  return { repository, consultas };
}

function mensaje({
  id,
  conversationId = 10,
  participantId = 2,
  createdAt = '2026-11-02T10:00:00.000Z',
  deletedAt = null,
}) {
  return {
    id,
    conversationId,
    participantId,
    createdAt: new Date(createdAt),
    deletedAt,
  };
}

test('Bandeja: sin mensajes devuelve contador cero', async () => {
  const conversations = [
    crearConversacion({
      id: 10,
      participantId: 1,
      createdAt: '2026-11-01T10:00:00.000Z',
    }),
  ];

  const { repository } = crearEscenario(conversations, []);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado[0].unreadCount, 0);
  assert.equal(resultado[0].lastReadMessageId, null);
  assert.equal(resultado[0].lastReadAt, null);
});

test('Bandeja: cuenta mensajes recibidos despues de incorporarse', async () => {
  const conversations = [
    crearConversacion({
      id: 10,
      participantId: 1,
      createdAt: '2026-11-01T10:00:00.000Z',
    }),
  ];

  const mensajes = [
    mensaje({ id: 1 }),
    mensaje({ id: 2 }),
    mensaje({ id: 3 }),
  ];

  const { repository } = crearEscenario(conversations, mensajes);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado[0].unreadCount, 3);
});

test('Bandeja: excluye mensajes propios', async () => {
  const conversations = [
    crearConversacion({
      id: 10,
      participantId: 1,
      createdAt: '2026-11-01T10:00:00.000Z',
    }),
  ];

  const mensajes = [
    mensaje({ id: 1, participantId: 1 }),
    mensaje({ id: 2, participantId: 2 }),
  ];

  const { repository } = crearEscenario(conversations, mensajes);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado[0].unreadCount, 1);
});

test('Bandeja: excluye mensajes anteriores a la incorporacion', async () => {
  const conversations = [
    crearConversacion({
      id: 10,
      participantId: 1,
      createdAt: '2026-11-02T09:00:00.000Z',
    }),
  ];

  const mensajes = [
    mensaje({
      id: 1,
      createdAt: '2026-11-02T08:00:00.000Z',
    }),
    mensaje({
      id: 2,
      createdAt: '2026-11-02T10:00:00.000Z',
    }),
  ];

  const { repository } = crearEscenario(conversations, mensajes);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado[0].unreadCount, 1);
});

test('Bandeja: excluye mensajes anteriores o iguales al marcador', async () => {
  const conversations = [
    crearConversacion({
      id: 10,
      participantId: 1,
      createdAt: '2026-11-01T10:00:00.000Z',
      lastReadMessageId: 3,
      lastReadAt: new Date('2026-11-02T10:00:00.000Z'),
    }),
  ];

  const mensajes = [
    mensaje({ id: 2 }),
    mensaje({ id: 3 }),
    mensaje({ id: 4 }),
    mensaje({ id: 5 }),
  ];

  const { repository } = crearEscenario(conversations, mensajes);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado[0].unreadCount, 2);
  assert.equal(resultado[0].lastReadMessageId, 3);
  assert.deepEqual(
    resultado[0].lastReadAt,
    new Date('2026-11-02T10:00:00.000Z')
  );
});

test('Bandeja: excluye mensajes eliminados logicamente', async () => {
  const conversations = [
    crearConversacion({
      id: 10,
      participantId: 1,
      createdAt: '2026-11-01T10:00:00.000Z',
    }),
  ];

  const mensajes = [
    mensaje({ id: 1 }),
    mensaje({
      id: 2,
      deletedAt: '2026-11-02T11:00:00.000Z',
    }),
  ];

  const { repository } = crearEscenario(conversations, mensajes);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado[0].unreadCount, 1);
});

test('Bandeja: calcula contadores independientes por conversacion', async () => {
  const conversations = [
    crearConversacion({
      id: 10,
      participantId: 1,
      createdAt: '2026-11-01T10:00:00.000Z',
    }),
    crearConversacion({
      id: 20,
      participantId: 3,
      createdAt: '2026-11-01T10:00:00.000Z',
    }),
  ];

  const mensajes = [
    mensaje({ id: 1, conversationId: 10 }),
    mensaje({ id: 2, conversationId: 10 }),
    mensaje({ id: 3, conversationId: 20 }),
  ];

  const { repository, consultas } =
    crearEscenario(conversations, mensajes);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado[0].unreadCount, 2);
  assert.equal(resultado[1].unreadCount, 1);

  assert.deepEqual(
    consultas.messages.by,
    ['conversationId']
  );
});

test('Bandeja: sin conversaciones devuelve lista vacia', async () => {
  const { repository, consultas } = crearEscenario([], []);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.deepEqual(resultado, []);
  assert.equal(consultas.messages, null);
});

test('Bandeja: solo expone marcador del usuario autenticado', async () => {
  const conversations = [
    crearConversacion({
      id: 10,
      participantId: 1,
      createdAt: '2026-11-01T10:00:00.000Z',
      lastReadMessageId: 5,
    }),
  ];

  conversations[0].participants.push({
    id: 2,
    userId: 2,
    rol: 'MIEMBRO',
    lastReadMessageId: 100,
    lastReadAt: new Date('2026-11-03T10:00:00.000Z'),
    user: {
      id: 2,
      nombre: 'Otro',
      apellido: 'Empleado',
    },
  });

  const { repository, consultas } =
    crearEscenario(conversations, []);

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado[0].lastReadMessageId, 5);
  assert.equal(resultado[0].unreadCount, 0);

  assert.equal(
    resultado[0].participants[1].lastReadMessageId,
    undefined
  );

  assert.equal(
    consultas.conversations.select.participants.select.lastReadMessageId,
    undefined
  );
});

test(
  'CH-05.6.2.4: reincorporacion excluye mensajes anteriores al nuevo joinedAt',
  async () => {
    const conversations = [
      crearConversacion({
        id: 10,
        participantId: 1,
        createdAt: '2026-11-01T10:00:00.000Z',
        joinedAt: '2026-11-03T10:00:00.000Z',
      }),
    ];

    const mensajes = [
      mensaje({
        id: 1,
        createdAt: '2026-11-02T10:00:00.000Z',
      }),
      mensaje({
        id: 2,
        createdAt: '2026-11-03T09:00:00.000Z',
      }),
      mensaje({
        id: 3,
        createdAt: '2026-11-03T11:00:00.000Z',
      }),
    ];

    const { repository, consultas } =
      crearEscenario(conversations, mensajes);

    const resultado =
      await repository.listarConversacionesInternas(1);

    assert.equal(resultado[0].unreadCount, 1);

    assert.deepEqual(
      consultas.messages.where.OR[0].createdAt,
      {
        gt: new Date('2026-11-03T10:00:00.000Z'),
      }
    );
  }
);