
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require('node:path').resolve(
  __dirname,
  '../src/config/database.js'
);

const repoPath = require.resolve(
  '../src/modules/chat/repositories/commercial.repository'
);

let conversation = {
  id: 3,
  tipo: 'COMERCIAL',
  estado: 'PENDIENTE',
  assignedAgentId: null,
};

let participant = null;
let history = [];
let failHistory = false;

const prisma = {
  chatConversation: {
    async findMany({ where, take }) {
      assert.equal(where.tipo, 'COMERCIAL');

      return [conversation]
        .filter((item) => {
          if (
            where.assignedAgentId !== undefined &&
            item.assignedAgentId !== where.assignedAgentId
          ) {
            return false;
          }

          if (where.estado && item.estado !== where.estado) {
            return false;
          }

          if (where.id && item.id >= where.id.lt) {
            return false;
          }

          return true;
        })
        .slice(0, take);
    },

    async findFirst({ where }) {
      return (
        where.id === 3 &&
        where.tipo === 'COMERCIAL'
      )
        ? conversation
        : null;
    },
  },

  async $transaction(callback) {
    const snapshot = {
      conversation: { ...conversation },
      participant: participant && { ...participant },
      history: [...history],
    };

    const tx = {
      chatConversation: {
        async updateMany({ where, data }) {
          if (
            conversation.id !== where.id ||
            conversation.tipo !== where.tipo ||
            conversation.estado !== where.estado ||
            conversation.assignedAgentId !== where.assignedAgentId
          ) {
            return { count: 0 };
          }

          conversation = {
            ...conversation,
            ...data,
          };

          return { count: 1 };
        },

        async findFirst({ where }) {
          return (
            where.id === 3 &&
            where.tipo === 'COMERCIAL'
          )
            ? conversation
            : null;
        },

        async findUnique() {
          return conversation;
        },
      },

      chatParticipant: {
        async findFirst() {
          return participant;
        },

        async create({ data }) {
          participant = {
            id: 10,
            ...data,
          };

          return participant;
        },

        async update({ data }) {
          participant = {
            ...participant,
            ...data,
          };

          return participant;
        },
      },

      chatAssignmentHistory: {
        async create({ data }) {
          if (failHistory) {
            throw new Error('fallo de historial');
          }

          history.push(data);
          return data;
        },
      },
    };

    try {
      return await callback(tx);
    } catch (error) {
      conversation = snapshot.conversation;
      participant = snapshot.participant;
      history = snapshot.history;
      throw error;
    }
  },
};

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: prisma,
};

const repo = require(repoPath);

test('bandeja filtra COMERCIAL y pagina por ID descendente', async () => {
  const result = await repo.listar({
    limit: 20,
    cursor: null,
  });

  assert.equal(result.conversations.length, 1);
  assert.equal(result.nextCursor, null);

  const siguiente = await repo.listar({
    limit: 20,
    cursor: 2,
  });

  assert.equal(siguiente.conversations.length, 0);
});

test('una sola asignacion gana y registra participante e historial', async () => {
  const [a, b] = await Promise.all([
    repo.asignar(3, 2),
    repo.asignar(3, 4),
  ]);

  assert.equal(
    [a, b].filter((result) => result.conversation).length,
    1
  );

  assert.equal(
    [a, b].filter((result) => result.error === 'CONFLICT').length,
    1
  );

  assert.equal(participant.rol, 'AGENTE');
  assert.equal(
    participant.userId,
    conversation.assignedAgentId
  );

  assert.equal(history.length, 1);

  assert.deepEqual(history[0], {
    conversationId: 3,
    fromAgentId: null,
    toAgentId: 2,
    changedByUserId: 2,
  });
});

test('reintento de asignacion no genera nuevo historial', async () => {
  const result = await repo.asignar(3, 2);

  assert.equal(result.error, 'CONFLICT');
  assert.equal(history.length, 1);
});

test('error durante historial revierte asignacion y participante', async () => {
  conversation = {
    id: 3,
    tipo: 'COMERCIAL',
    estado: 'PENDIENTE',
    assignedAgentId: null,
  };

  participant = null;
  history = [];
  failHistory = true;

  await assert.rejects(
    repo.asignar(3, 2),
    /fallo de historial/
  );

  assert.equal(conversation.assignedAgentId, null);
  assert.equal(conversation.estado, 'PENDIENTE');
  assert.equal(participant, null);
  assert.equal(history.length, 0);
});

test('listarPropias filtra por el agente asignado', async () => {
  conversation = {
    id: 3,
    tipo: 'COMERCIAL',
    estado: 'ASIGNADA',
    assignedAgentId: 2,
  };

  const propias = await repo.listarPropias({
    agentId: 2,
    limit: 20,
    cursor: null,
  });

  assert.equal(propias.conversations.length, 1);

  const ajenas = await repo.listarPropias({
    agentId: 4,
    limit: 20,
    cursor: null,
  });

  assert.equal(ajenas.conversations.length, 0);
});

test('listarPropias respeta estado y cursor', async () => {
  const filtradas = await repo.listarPropias({
    agentId: 2,
    limit: 20,
    cursor: 3,
    estado: 'ASIGNADA',
  });

  assert.equal(filtradas.conversations.length, 0);

  const estadoDistinto = await repo.listarPropias({
    agentId: 2,
    limit: 20,
    cursor: null,
    estado: 'RESUELTA',
  });

  assert.equal(estadoDistinto.conversations.length, 0);
});
