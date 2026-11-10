
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

const jwtPath = require.resolve('../src/utils/jwt');
const commercialPath = require.resolve(
  '../src/modules/chat/services/commercial.service'
);
const messageRepositoryPath = require.resolve(
  '../src/modules/chat/repositories/commercial-message.repository'
);
const chatRepositoryPath = require.resolve(
  '../src/modules/chat/repositories/chat.repository'
);
const messageServicePath = require.resolve(
  '../src/modules/chat/services/commercial-message.service'
);
const controllerPath = require.resolve(
  '../src/modules/chat/controllers/commercial.controller'
);
const routesPath = require.resolve(
  '../src/modules/chat/routes/commercial.routes'
);
const userRepositoryPath = require.resolve(
  '../src/modules/users/repositories/user.repository'
);
const authPath = require.resolve(
  '../src/modules/auth/middlewares/auth.middleware'
);

const originals = new Map();

function mockModule(path, exports) {
  originals.set(path, require.cache[path]);

  require.cache[path] = {
    id: path,
    filename: path,
    loaded: true,
    exports,
  };
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const messages = [
  {
    id: 40,
    conversationId: 3,
    contenido: 'Mensaje comercial de prueba',
  },
];

const state = {
  calls: [],
};

function reset() {
  state.calls = [];
}

function validarEmpleado(user) {
  if (!user || ![1, 2, 3].includes(user.id)) {
    throw httpError(403, 'Sin permisos comerciales.');
  }

  return { id: user.id };
}

mockModule(userRepositoryPath, {
  async obtenerPorId(id) {
    const usuarios = {
      1: { id: 1, correo: 'agente@correo.com', activo: true, role: { nombre: 'Vendedor' } },
      2: { id: 2, correo: 'vendedor@correo.com', activo: true, role: { nombre: 'Vendedor' } },
      3: { id: 3, correo: 'admin@correo.com', activo: true, role: { nombre: 'Administrador' } },
      99: { id: 99, correo: 'usuario@correo.com', activo: true, role: { nombre: 'Usuario' } },
    };
    return usuarios[id] ?? null;
  },
});
mockModule(jwtPath, {
  verificarToken(token) {
    const identities = {
      agente: 1,
      vendedor: 2,
      administrador: 3,
      sinpermisos: 99,
    };

    if (Object.prototype.hasOwnProperty.call(identities, token)) {
      return { id: identities[token] };
    }

    throw new Error('Token invalido');
  },
});

mockModule(commercialPath, {
  async autorizar(user) {
    const employee = validarEmpleado(user);
    state.calls.push(['autorizar', employee.id]);
    return employee;
  },

  async obtener(user, conversationId) {
    const employee = validarEmpleado(user);

    state.calls.push([
      'obtener',
      employee.id,
      conversationId,
    ]);

    if (!/^[1-9][0-9]*$/.test(String(conversationId))) {
      throw httpError(400, 'ID de conversacion invalido.');
    }

    if (Number(conversationId) !== 3) {
      throw httpError(
        404,
        'Conversacion comercial no encontrada.'
      );
    }

    return {
      id: 3,
      tipo: 'COMERCIAL',
      estado: 'ASIGNADA',
      assignedAgentId: 1,
    };
  },
});

mockModule(messageRepositoryPath, {
  async enviarAtomico(input) {
    state.calls.push(['enviarAtomico', input]);

    if (input.agentId !== 1) {
      return { error: 'NOT_FOUND' };
    }

    return {
      creado: true,
      mensaje: {
        id: 41,
        conversationId: 3,
        contenido: input.contenido,
        clientMessageId: input.clientMessageId,
      },
    };
  },

  async buscarParticipanteActivo() {
    return null;
  },
});

mockModule(chatRepositoryPath, {
  async listarMensajes(input) {
    state.calls.push(['listarMensajes', input]);

    return {
      messages,
      nextCursor: null,
    };
  },

  async buscarMensajePorClave() {
    return null;
  },
});

delete require.cache[authPath];
delete require.cache[messageServicePath];
delete require.cache[controllerPath];
delete require.cache[routesPath];

const commercialRoutes = require(routesPath);

const app = express();
app.disable('etag');
app.use(express.json());
app.use('/api/chat/commercial', commercialRoutes);

app.use((error, req, res, next) => {
  return res.status(error.status || 500).json({
    success: false,
    message:
      error.status && error.status < 500
        ? error.message
        : 'Error interno del servidor.',
  });
});

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.beforeEach(reset);

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  for (const path of [
    routesPath,
    controllerPath,
    messageServicePath,
    userRepositoryPath,
    authPath,
    chatRepositoryPath,
    messageRepositoryPath,
    commercialPath,
    jwtPath,
  ]) {
    delete require.cache[path];

    const original = originals.get(path);

    if (original) {
      require.cache[path] = original;
    }
  }
});

async function request({
  token = 'vendedor',
  conversationId = 3,
  method = 'GET',
  query = '',
  body,
} = {}) {
  const headers = {};

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(
    `${baseUrl}/api/chat/commercial/conversations/${conversationId}/messages${query}`,
    {
      method,
      headers,
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
    }
  );

  return {
    status: response.status,
    headers: response.headers,
    json: await response.json(),
  };
}

test('HTTP 200: vendedor no asignado consulta mensajes', async () => {
  const response = await request({
    token: 'vendedor',
    query: '?limit=10',
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.success, true);
  assert.deepEqual(response.json.data.messages, messages);
  assert.equal(
    response.headers.get('cache-control'),
    'no-store'
  );

  assert.ok(
    state.calls.some(
      ([operation, id]) =>
        operation === 'obtener' && id === 2
    )
  );

  assert.ok(
    state.calls.some(
      ([operation]) => operation === 'listarMensajes'
    )
  );
});

test('HTTP 200: administrador no asignado consulta mensajes', async () => {
  const response = await request({
    token: 'administrador',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.json.data.messages, messages);

  assert.ok(
    state.calls.some(
      ([operation, id]) =>
        operation === 'obtener' && id === 3
    )
  );
});

test('HTTP 200: agente asignado consulta mensajes', async () => {
  const response = await request({
    token: 'agente',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.json.data.messages, messages);
});

test('HTTP 200: vendedor consulta mensajes incrementales', async () => {
  const response = await request({
    token: 'vendedor',
    query: '?afterId=40',
  });

  assert.equal(response.status, 200);

  assert.ok(
    state.calls.some(
      ([operation, input]) =>
        operation === 'listarMensajes' &&
        input.conversationId === 3 &&
        input.afterId === 40
    )
  );
});

test('HTTP 401: rechaza solicitud sin token', async () => {
  const response = await request({ token: null });

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
  assert.equal(state.calls.length, 0);
});

test('HTTP 401: rechaza token invalido', async () => {
  const response = await request({
    token: 'incorrecto',
  });

  assert.equal(response.status, 401);
  assert.equal(state.calls.length, 0);
});

test('HTTP 403: rechaza usuario sin permisos comerciales', async () => {
  const response = await request({
    token: 'sinpermisos',
  });

  assert.equal(response.status, 403);
  assert.equal(response.json.success, false);

  assert.equal(
    state.calls.some(
      ([operation]) => operation === 'listarMensajes'
    ),
    false
  );
});

test('HTTP 404: no revela mensajes de conversacion inexistente', async () => {
  const response = await request({
    conversationId: 999,
  });

  assert.equal(response.status, 404);

  assert.equal(
    state.calls.some(
      ([operation]) => operation === 'listarMensajes'
    ),
    false
  );
});

test('HTTP 400: rechaza ID de conversacion invalido', async () => {
  const response = await request({
    conversationId: 'abc',
  });

  assert.equal(response.status, 400);
});

test('HTTP 400: rechaza paginacion invalida', async () => {
  const response = await request({
    query: '?limit=51',
  });

  assert.equal(response.status, 400);

  assert.equal(
    state.calls.some(
      ([operation]) => operation === 'listarMensajes'
    ),
    false
  );
});

test('HTTP 404: vendedor no asignado no puede enviar', async () => {
  const response = await request({
    token: 'vendedor',
    method: 'POST',
    body: {
      contenido: 'Mensaje no autorizado',
      clientMessageId: 'agente-000002',
    },
  });

  assert.equal(response.status, 404);
  assert.equal(response.json.success, false);

  assert.ok(
    state.calls.some(
      ([operation, input]) =>
        operation === 'enviarAtomico' &&
        input.agentId === 2
    )
  );
});

test('HTTP 201: agente asignado puede enviar', async () => {
  const response = await request({
    token: 'agente',
    method: 'POST',
    body: {
      contenido: 'Mensaje autorizado',
      clientMessageId: 'agente-000001',
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.json.success, true);
  assert.equal(response.json.creado, true);

  assert.ok(
    state.calls.some(
      ([operation, input]) =>
        operation === 'enviarAtomico' &&
        input.agentId === 1
    )
  );
});
