
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve(
  '../src/config/database'
);
const repositoryPath = require.resolve(
  '../src/modules/chat/repositories/commercial-message.repository'
);

const originalDatabase = require.cache[databasePath];

const state = {
  participant: null,
  message: null,
  calls: [],
};

function reset() {
  state.participant = {
    id: 20,
    conversationId: 3,
    userId: 1,
    conversation: { estado: 'ASIGNADA' },
  };
  state.message = null;
  state.calls = [];
}

const tx = {
  chatParticipant: {
    async findFirst(args) {
      state.calls.push(['participant', args]);
      return state.participant;
    },
  },
  chatMessage: {
    async findUnique(args) {
      state.calls.push(['findUnique', args]);
      return state.message;
    },
    async create(args) {
      state.calls.push(['create', args]);
      return {
        id: 40,
        ...args.data,
      };
    },
  },
};

const prisma = {
  chatParticipant: tx.chatParticipant,
  async $transaction(callback, options) {
    state.calls.push(['transaction', options]);
    return callback(tx);
  },
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: prisma,
};

delete require.cache[repositoryPath];
const repository = require(repositoryPath);

test.after(() => {
  delete require.cache[repositoryPath];

  if (originalDatabase) {
    require.cache[databasePath] = originalDatabase;
  } else {
    delete require.cache[databasePath];
  }
});

test('busca participante AGENTE asignado y activo', async () => {
  reset();

  const participant = await repository.buscarParticipanteActivo(1, 3);

  assert.equal(participant.id, 20);

  const where = state.calls[0][1].where;

  assert.equal(where.userId, 1);
  assert.equal(where.conversationId, 3);
  assert.equal(where.rol, 'AGENTE');
  assert.equal(where.leftAt, null);
  assert.equal(where.user.activo, true);
  assert.equal(where.conversation.tipo, 'COMERCIAL');
  assert.equal(where.conversation.assignedAgentId, 1);
});

test('envio usa transaccion Serializable', async () => {
  reset();

  const result = await repository.enviarAtomico({
    agentId: 1,
    conversationId: 3,
    contenido: 'Hola',
    clientMessageId: 'agente-000001',
  });

  assert.equal(result.creado, true);
  assert.equal(result.mensaje.participantId, 20);

  assert.deepEqual(state.calls[0], [
    'transaction',
    { isolationLevel: 'Serializable' },
  ]);
});

test('no escribe si el agente no tiene acceso', async () => {
  reset();
  state.participant = null;

  const result = await repository.enviarAtomico({
    agentId: 2,
    conversationId: 3,
    contenido: 'Hola',
    clientMessageId: 'agente-000001',
  });

  assert.equal(result.error, 'NOT_FOUND');
  assert.equal(
    state.calls.some(([operation]) => operation === 'create'),
    false
  );
});

test('no escribe en conversaciones resueltas', async () => {
  reset();
  state.participant.conversation.estado = 'RESUELTA';

  const result = await repository.enviarAtomico({
    agentId: 1,
    conversationId: 3,
    contenido: 'Hola',
    clientMessageId: 'agente-000001',
  });

  assert.equal(result.error, 'RESOLVED');
  assert.equal(
    state.calls.some(([operation]) => operation === 'create'),
    false
  );
});

test('reutiliza mensaje existente sin insertar otro', async () => {
  reset();
  state.message = {
    id: 40,
    conversationId: 3,
    participantId: 20,
    contenido: 'Hola',
    clientMessageId: 'agente-000001',
  };

  const result = await repository.enviarAtomico({
    agentId: 1,
    conversationId: 3,
    contenido: 'Hola',
    clientMessageId: 'agente-000001',
  });

  assert.equal(result.creado, false);
  assert.equal(result.mensaje.id, 40);
  assert.equal(
    state.calls.some(([operation]) => operation === 'create'),
    false
  );
});
