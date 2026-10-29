'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const visitorRepoPath = require.resolve(
  '../src/modules/chat/repositories/visitor-message.repository'
);
const chatRepoPath = require.resolve(
  '../src/modules/chat/repositories/chat.repository'
);
const servicePath = require.resolve(
  '../src/modules/chat/services/visitor-message.service'
);

const participants = new Map([
  [11, { id: 501, conversationId: 3, visitorId: 11 }],
]);

const messages = new Map();

let failOnCreate = null;
let lastList = null;
let estado = 'EN_CURSO';
let intentos = 0;

const visitorRepo = {
  async buscarParticipanteActivo(visitorId, conversationId) {
    const participant = participants.get(visitorId);
    return participant?.conversationId === conversationId
      ? participant
      : null;
  },

  async enviarAtomico({
    visitorId,
    conversationId,
    contenido,
    clientMessageId,
  }) {
    intentos++;

    const participant = await this.buscarParticipanteActivo(
      visitorId,
      conversationId
    );

    if (!participant) {
      return { error: 'NOT_FOUND' };
    }

    if (estado === 'RESUELTA') {
      return { error: 'RESOLVED' };
    }

    const existing = messages.get(
      `${participant.id}:${clientMessageId}`
    );

    if (existing) {
      return {
        creado: false,
        mensaje: existing,
      };
    }

    if (failOnCreate) {
      const error = failOnCreate;
      failOnCreate = null;
      throw error;
    }

    const mensaje = {
      id: messages.size + 1,
      conversationId,
      participantId: participant.id,
      contenido,
      clientMessageId,
    };

    messages.set(
      `${participant.id}:${clientMessageId}`,
      mensaje
    );

    return {
      creado: true,
      mensaje,
    };
  },
};

const chatRepo = {
  async buscarMensajePorClave(participantId, key) {
    return messages.get(`${participantId}:${key}`) || null;
  },

  async listarMensajes(query) {
    lastList = query;
    return {
      messages: [],
      nextCursor: null,
    };
  },
};

require.cache[visitorRepoPath] = {
  id: visitorRepoPath,
  filename: visitorRepoPath,
  loaded: true,
  exports: visitorRepo,
};

require.cache[chatRepoPath] = {
  id: chatRepoPath,
  filename: chatRepoPath,
  loaded: true,
  exports: chatRepo,
};

const service = require(servicePath);
const key = 'visitor_msg_1234';

test('rechaza visitante sin identidad valida', async () => {
  await assert.rejects(
    service.enviar(null, '3', {
      contenido: 'Hola',
      clientMessageId: key,
    }),
    { status: 401 }
  );
});

test('rechaza ID de conversacion invalido', async () => {
  await assert.rejects(
    service.listar(11, 'abc', {}),
    { status: 400 }
  );
});

test('oculta conversaciones ajenas e internas', async () => {
  await assert.rejects(
    service.enviar(12, '3', {
      contenido: 'Hola',
      clientMessageId: key,
    }),
    { status: 404 }
  );

  await assert.rejects(
    service.listar(11, '1', {}),
    { status: 404 }
  );
});

test('rechaza mensaje vacio y clave invalida', async () => {
  await assert.rejects(
    service.enviar(11, '3', {
      contenido: ' ',
      clientMessageId: key,
    }),
    { status: 400 }
  );

  await assert.rejects(
    service.enviar(11, '3', {
      contenido: 'Hola',
      clientMessageId: 'x',
    }),
    { status: 400 }
  );
});

test('crea mensaje usando el participante autorizado', async () => {
  const result = await service.enviar(11, '3', {
    contenido: '  Hola  ',
    clientMessageId: key,
  });

  assert.equal(result.creado, true);
  assert.equal(result.mensaje.participantId, 501);
  assert.equal(result.mensaje.contenido, 'Hola');
});

test('reintento identico no duplica mensajes', async () => {
  const result = await service.enviar(11, '3', {
    contenido: 'Hola',
    clientMessageId: key,
  });

  assert.equal(result.creado, false);
  assert.equal(messages.size, 1);
});

test('reutilizar clave con otro contenido devuelve 409', async () => {
  await assert.rejects(
    service.enviar(11, '3', {
      contenido: 'Distinto',
      clientMessageId: key,
    }),
    { status: 409 }
  );
});

test('resuelve colision P2002 tras escritura concurrente', async () => {
  failOnCreate = Object.assign(
    new Error('duplicate'),
    { code: 'P2002' }
  );

  const result = await service.enviar(11, '3', {
    contenido: 'Hola',
    clientMessageId: key,
  });

  assert.equal(result.creado, false);
});

test('propaga errores de escritura distintos de P2002', async () => {
  failOnCreate = Object.assign(
    new Error('db error'),
    { code: 'P1001' }
  );

  await assert.rejects(
    service.enviar(11, '3', {
      contenido: 'Otro',
      clientMessageId: 'visitor_msg_5678',
    }),
    /db error/
  );
});

test('lista mensajes con paginacion validada', async () => {
  const result = await service.listar(11, '3', {
    limit: '10',
    cursor: '8',
  });

  assert.deepEqual(result, {
    messages: [],
    nextCursor: null,
  });

  assert.deepEqual(lastList, {
    conversationId: 3,
    limit: 10,
    cursor: 8,
  });
});

test('rechaza paginacion invalida', async () => {
  await assert.rejects(
    service.listar(11, '3', { limit: '1000' }),
    { status: 400 }
  );
});

test('rechaza mensajes nuevos en conversacion resuelta', async () => {
  estado = 'RESUELTA';

  try {
    await assert.rejects(
      service.enviar(11, '3', {
        contenido: 'Mensaje posterior al cierre',
        clientMessageId: 'visitor_msg_9999',
      }),
      { status: 409 }
    );

    assert.equal(messages.size, 1);
  } finally {
    estado = 'EN_CURSO';
  }
});

test('reintenta conflictos de serializacion P2034', async () => {
  failOnCreate = Object.assign(
    new Error('serialization conflict'),
    { code: 'P2034' }
  );

  const anteriores = intentos;

  const result = await service.enviar(11, '3', {
    contenido: 'Mensaje tras reintento',
    clientMessageId: 'visitor_msg_7777',
  });

  assert.equal(result.creado, true);
  assert.equal(intentos - anteriores, 2);
});
