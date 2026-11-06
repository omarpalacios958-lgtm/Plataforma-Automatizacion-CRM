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
  participant: null,
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

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validarEmpleado(user) {
  if (!user || ![1, 2, 3].includes(user.id)) {
    throw httpError(403, 'Sin permisos comerciales.');
  }

  return { id: user.id };
}

require.cache[commercialPath] = {
  id: commercialPath,
  filename: commercialPath,
  loaded: true,
  exports: {
    async autorizar(user) {
      return validarEmpleado(user);
    },

    async obtener(user, conversationId) {
      const employee = validarEmpleado(user);
      state.calls.push(['obtener', employee.id, conversationId]);

      if (!/^[1-9][0-9]*$/.test(String(conversationId))) {
        throw httpError(400, 'ID de conversacion invalido.');
      }

      if (Number(conversationId) !== 3) {
        throw httpError(404, 'Conversacion comercial no encontrada.');
      }

      return {
        id: 3,
        tipo: 'COMERCIAL',
        assignedAgentId: 1,
      };
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

test('agente asignado consulta mensajes paginados', async () => {
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
    ['obtener', 1, '3'],
    ['listar', { conversationId: 3, limit: 10, cursor: 50 }],
  ]);
});

test('conversacion comercial inexistente devuelve 404', async () => {
  reset();

  await assert.rejects(
    () => service.listar({ id: 1 }, '999'),
    { status: 404 }
  );

  assert.equal(
    state.calls.some(([operation]) => operation === 'listar'),
    false
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
    () => service.listar({ id: 99 }, '3'),
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

test('agente asignado consulta mensajes posteriores con afterId', async () => {
  reset();

  const result = await service.listar(
    { id: 1 },
    '3',
    { limit: '20', afterId: '40' }
  );

  assert.deepEqual(result, {
    messages: [],
    nextCursor: null,
  });

  assert.deepEqual(state.calls, [
    ['obtener', 1, '3'],
    ['listar', {
      conversationId: 3,
      limit: 20,
      cursor: null,
      afterId: 40,
    }],
  ]);
});

test('conversacion inexistente no permite lectura incremental', async () => {
  reset();

  await assert.rejects(
    () => service.listar(
      { id: 1 },
      '999',
      { afterId: '40' }
    ),
    { status: 404 }
  );

  assert.equal(
    state.calls.some(([operation]) => operation === 'listar'),
    false
  );
});

test('vendedor no asignado puede leer mensajes comerciales', async () => {
  reset();

  const result = await service.listar(
    { id: 2 },
    '3',
    { limit: '10' }
  );

  assert.deepEqual(result, {
    messages: [],
    nextCursor: null,
  });

  assert.deepEqual(state.calls, [
    ['obtener', 2, '3'],
    ['listar', {
      conversationId: 3,
      limit: 10,
      cursor: null,
    }],
  ]);
});

test('administrador no asignado puede leer mensajes comerciales', async () => {
  reset();

  const result = await service.listar(
    { id: 3 },
    '3'
  );

  assert.deepEqual(result, {
    messages: [],
    nextCursor: null,
  });

  assert.equal(state.calls[0][0], 'obtener');
  assert.equal(state.calls[0][1], 3);
  assert.equal(state.calls[1][0], 'listar');
});

test('vendedor no asignado puede consultar mensajes incrementales', async () => {
  reset();

  const result = await service.listar(
    { id: 2 },
    '3',
    { afterId: '40' }
  );

  assert.deepEqual(result, {
    messages: [],
    nextCursor: null,
  });

  assert.deepEqual(state.calls, [
    ['obtener', 2, '3'],
    ['listar', {
      conversationId: 3,
      limit: 20,
      cursor: null,
      afterId: 40,
    }],
  ]);
});

test('usuario sin permisos comerciales no puede leer mensajes', async () => {
  reset();

  await assert.rejects(
    () => service.listar({ id: 99 }, '3'),
    { status: 403 }
  );

  assert.equal(
    state.calls.some(([operation]) => operation === 'listar'),
    false
  );
});

test('empleado no asignado no puede enviar mensajes', async () => {
  reset();
  state.result = { error: 'NOT_FOUND' };

  await assert.rejects(
    () => service.enviar(
      { id: 2 },
      '3',
      {
        contenido: 'No autorizado',
        clientMessageId: 'agente-000002',
      }
    ),
    { status: 404 }
  );
});