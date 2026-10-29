
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/config/database');
const repoPath = require.resolve(
  '../src/modules/chat/repositories/commercial.repository'
);

let conversation;
let participant;

function reiniciar() {
  conversation = {
    id: 3,
    tipo: 'COMERCIAL',
    estado: 'ASIGNADA',
    assignedAgentId: 2,
  };

  participant = {
    userId: 2,
    rol: 'AGENTE',
    leftAt: null,
  };
}

function coincide(where) {
  if (!conversation) return false;

  return (
    conversation.id === where.id &&
    conversation.tipo === where.tipo &&
    conversation.assignedAgentId === where.assignedAgentId &&
    (where.estado === undefined ||
      conversation.estado === where.estado) &&
    participant !== null &&
    participant.userId === where.participants.some.userId &&
    participant.rol === where.participants.some.rol &&
    participant.leftAt === where.participants.some.leftAt
  );
}

const prisma = {
  chatConversation: {
    async updateMany({ where, data }) {
      if (!coincide(where)) return { count: 0 };

      conversation = {
        ...conversation,
        ...data,
      };

      return { count: 1 };
    },

    async findFirst({ where }) {
      return coincide(where) ? { id: conversation.id } : null;
    },

    async findUnique({ where }) {
      return conversation?.id === where.id
        ? { ...conversation }
        : null;
    },
  },
};

const originalDb = require.cache[dbPath];
const originalRepo = require.cache[repoPath];

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: prisma,
};

delete require.cache[repoPath];

const repo = require(repoPath);

test('cambia ASIGNADA a EN_CURSO para el agente asignado', async () => {
  reiniciar();

  const result = await repo.cambiarEstado(
    3, 2, 'ASIGNADA', 'EN_CURSO'
  );

  assert.equal(result.conversation.estado, 'EN_CURSO');
  assert.equal(conversation.estado, 'EN_CURSO');
});

test('cambia EN_CURSO a RESUELTA para el agente asignado', async () => {
  reiniciar();
  conversation.estado = 'EN_CURSO';

  const result = await repo.cambiarEstado(
    3, 2, 'EN_CURSO', 'RESUELTA'
  );

  assert.equal(result.conversation.estado, 'RESUELTA');
});

test('impide modificar conversaciones de otro agente', async () => {
  reiniciar();

  const result = await repo.cambiarEstado(
    3, 4, 'ASIGNADA', 'EN_CURSO'
  );

  assert.equal(result.error, 'NOT_FOUND');
  assert.equal(conversation.estado, 'ASIGNADA');
});

test('impide modificar conversaciones sin participante activo', async () => {
  reiniciar();
  participant.leftAt = new Date();

  const result = await repo.cambiarEstado(
    3, 2, 'ASIGNADA', 'EN_CURSO'
  );

  assert.equal(result.error, 'NOT_FOUND');
  assert.equal(conversation.estado, 'ASIGNADA');
});

test('rechaza transiciones repetidas', async () => {
  reiniciar();
  conversation.estado = 'EN_CURSO';

  const result = await repo.cambiarEstado(
    3, 2, 'ASIGNADA', 'EN_CURSO'
  );

  assert.equal(result.error, 'CONFLICT');
  assert.equal(conversation.estado, 'EN_CURSO');
});

test('impide reabrir conversaciones resueltas', async () => {
  reiniciar();
  conversation.estado = 'RESUELTA';

  const result = await repo.cambiarEstado(
    3, 2, 'ASIGNADA', 'EN_CURSO'
  );

  assert.equal(result.error, 'CONFLICT');
  assert.equal(conversation.estado, 'RESUELTA');
});

test('oculta conversaciones inexistentes', async () => {
  reiniciar();

  const result = await repo.cambiarEstado(
    999, 2, 'ASIGNADA', 'EN_CURSO'
  );

  assert.equal(result.error, 'NOT_FOUND');
});

test.after(() => {
  delete require.cache[repoPath];

  if (originalRepo) {
    require.cache[repoPath] = originalRepo;
  }

  if (originalDb) {
    require.cache[dbPath] = originalDb;
  } else {
    delete require.cache[dbPath];
  }
});
