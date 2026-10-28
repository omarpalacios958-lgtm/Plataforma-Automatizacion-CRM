
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const servicePath = require.resolve(
  '../src/modules/chat/services/commercial-message.service'
);
const commercialPath = require.resolve(
  '../src/modules/chat/services/commercial.service'
);
const repositoryPath = require.resolve(
  '../src/modules/chat/repositories/commercial-message.repository'
);
const chatRepositoryPath = require.resolve(
  '../src/modules/chat/repositories/chat.repository'
);

const originalCommercial = require.cache[commercialPath];
const originalRepository = require.cache[repositoryPath];
const originalChatRepository = require.cache[chatRepositoryPath];

const state = {
  employee: { id: 1 },
  participant: {
    id: 20,
    conversationId: 3,
    userId: 1,
    conversation: { estado: 'ASIGNADA' },
  },
  result: null,
  error: null,
  calls: [],
};

function reset() {
  state.employee = { id: 1 };
  state.participant = {
    id: 20,
    conversationId: 3,
    userId: 1,
    conversation: { estado: 'ASIGNADA' },
  };
  state.result = {
    creado: true,
    mensaje: {
      id: 40,
      conversationId: 3,
      participantId: 20,
      contenido: 'Hola',
      clientMessageId: 'agente-000001',
    },
  };
  state.error = null;
  state.calls = [];
}

require.cache[commercialPath] = {
  id: commercialPath,
  filename: commercialPath,
  loaded: true,
  exports: {
    async autorizar(user) {
      if (!user || user.id !== 1) {
        const error = new Error('Sin permisos.');
        error.status = 403;
        throw error;
      }
      return state.employee;
    },
  },
};

require.cache[repositoryPath] = {
  id: repositoryPath,
  filename: repositoryPath,
  loaded: true,
  exports: {
    async buscarParticipanteActivo(agentId, conversationId) {
      state.calls.push(['acceso', agentId, conversationId]);
      return state.participant;
    },
    async enviarAtomico(input) {
      state.calls.push(['enviar', input]);
      if (state.error) throw state.error;
      return state.result;
    },
  },
};

require.cache[chatRepositoryPath] = {
  id: chatRepositoryPath,
  filename: chatRepositoryPath,
  loaded: true,
  exports: {
    async buscarMensajePorClave(participantId, clientMessageId) {
      state.calls.push(['buscarClave', participantId, clientMessageId]);
      return state.result?.mensaje || null;
    },
    async listarMensajes(input) {
      state.calls.push(['listar', input]);
      return { messages: [], nextCursor: null };
    },
  },
};

delete require.cache[servicePath];
const service = require(servicePath);

test.after(() => {
  delete require.cache[servicePath];

  for (const [path, original] of [
    [commercialPath, originalCommercial],
    [repositoryPath, originalRepository],
    [chatRepositoryPath, originalChatRepository],
  ]) {
    if (original) require.cache[path] = original;
    else delete require.cache[path];
  }
});

test('agente autorizado consulta mensajes paginados', async () => {
  reset();

  const result = await service.listar(
    { id: 1 },
    '3',
    { limit: '10', cursor: '50' }
  );

  assert.deepEqual(result, {
    messages: [],
    nextCursor: null,
  });

  assert.deepEqual(state.calls, [
    ['acceso', 1, 3],
    ['listar', { conversationId: 3, limit: 10, cursor: 50 }],
  ]);
});

test('conversacion ajena devuelve 404', async () => {
  reset();
  state.participant = null;

  await assert.rejects(
    () => service.listar({ id: 1 }, '3'),
    { status: 404 }
  );
});

test('rechaza paginacion invalida', async () => {
  reset();

  await assert.rejects(
    () => service.listar({ id: 1 }, '3', { limit: '51' }),
    { status: 400 }
  );
});

test('rechaza identidad e ID invalidos', async () => {
  reset();

  await assert.rejects(
    () => service.listar({ id: 2 }, '3'),
    { status: 403 }
  );

  await assert.rejects(
    () => service.enviar({ id: 1 }, 'abc', {
      contenido: 'Hola',
      clientMessageId: 'agente-000001',
    }),
    { status: 400 }
  );
});

test('crea mensaje usando el agente autenticado', async () => {
  reset();

  const result = await service.enviar(
    { id: 1 },
    '3',
    {
      contenido: ' Hola ',
      clientMessageId: 'agente-000001',
    }
  );

  assert.equal(result.creado, true);
  assert.deepEqual(state.calls[0], [
    'enviar',
    {
      agentId: 1,
      conversationId: 3,
      contenido: 'Hola',
      clientMessageId: 'agente-000001',
    },
  ]);
});

test('rechaza contenido y clave invalidos', async () => {
  reset();

  await assert.rejects(
    () => service.enviar({ id: 1 }, '3', {
      contenido: '',
      clientMessageId: 'agente-000001',
    }),
    { status: 400 }
  );

  await assert.rejects(
    () => service.enviar({ id: 1 }, '3', {
      contenido: 'Hola',
      clientMessageId: 'x',
    }),
    { status: 400 }
  );
});

test('reintento identico no duplica mensajes', async () => {
  reset();
  state.result.creado = false;

  const result = await service.enviar(
    { id: 1 },
    '3',
    {
      contenido: 'Hola',
      clientMessageId: 'agente-000001',
    }
  );

  assert.equal(result.creado, false);
});

test('reutilizar clave con otro contenido devuelve 409', async () => {
  reset();
  state.result.creado = false;
  state.result.mensaje.contenido = 'Otro contenido';

  await assert.rejects(
    () => service.enviar({ id: 1 }, '3', {
      contenido: 'Hola',
      clientMessageId: 'agente-000001',
    }),
    { status: 409 }
  );
});

test('rechaza escritura en conversacion ajena', async () => {
  reset();
  state.result = { error: 'NOT_FOUND' };

  await assert.rejects(
    () => service.enviar({ id: 1 }, '3', {
      contenido: 'Hola',
      clientMessageId: 'agente-000001',
    }),
    { status: 404 }
  );
});

test('rechaza escritura en conversacion resuelta', async () => {
  reset();
  state.result = { error: 'RESOLVED' };

  await assert.rejects(
    () => service.enviar({ id: 1 }, '3', {
      contenido: 'Hola',
      clientMessageId: 'agente-000001',
    }),
    { status: 409 }
  );
});

test('reintenta conflictos de serializacion P2034', async () => {
  reset();

  let attempts = 0;
  const original = require.cache[repositoryPath].exports.enviarAtomico;

  require.cache[repositoryPath].exports.enviarAtomico = async (input) => {
    attempts++;
    if (attempts === 1) {
      const error = new Error('Serialization failure');
      error.code = 'P2034';
      throw error;
    }
    return original(input);
  };

  try {
    const result = await service.enviar(
      { id: 1 },
      '3',
      {
        contenido: 'Hola',
        clientMessageId: 'agente-000001',
      }
    );

    assert.equal(result.creado, true);
    assert.equal(attempts, 2);
  } finally {
    require.cache[repositoryPath].exports.enviarAtomico = original;
  }
});

test('resuelve colision P2002 recuperando el mensaje', async () => {
  reset();

  const error = new Error('Unique constraint');
  error.code = 'P2002';
  state.error = error;

  const result = await service.enviar(
    { id: 1 },
    '3',
    {
      contenido: 'Hola',
      clientMessageId: 'agente-000001',
    }
  );

  assert.equal(result.creado, false);
  assert.ok(state.calls.some(([operation]) => operation === 'buscarClave'));
});
