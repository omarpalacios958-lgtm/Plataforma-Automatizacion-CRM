
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

const jwtPath = require.resolve('../src/utils/jwt');
const servicePath = require.resolve(
  '../src/modules/chat/services/chat.service'
);
const controllerPath = require.resolve(
  '../src/modules/chat/controllers/chat.controller'
);
const routesPath = require.resolve(
  '../src/modules/chat/routes/chat.routes'
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

let errorServicio = null;
let ultimaLlamada = null;

const marcador = {
  conversationId: 3,
  lastReadMessageId: 10,
  lastReadAt: new Date('2026-11-03T20:00:00.000Z'),
};

mockModule(userRepositoryPath, {
  async obtenerPorId(id) {
    return id === 1
      ? { id: 1, correo: 'admin@correo.com', activo: true, role: { nombre: 'Administrador' } }
      : null;
  },
});
mockModule(jwtPath, {
  verificarToken(token) {
    if (token === 'valido') {
      return { id: 1 };
    }

    throw new Error('Token invalido');
  },
});

const servicioOriginal = require(servicePath);

mockModule(servicePath, {
  ...servicioOriginal,

  async marcarComoLeido(conversationId, datos, user) {
    ultimaLlamada = {
      conversationId,
      datos,
      user: { id: user.id },
    };

    if (errorServicio) {
      throw errorServicio;
    }

    return marcador;
  },
});

delete require.cache[authPath];
delete require.cache[controllerPath];
delete require.cache[routesPath];

const chatRoutes = require(routesPath);

const app = express();
app.disable('etag');
app.use(express.json());
app.use('/api/chat', chatRoutes);

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

test.beforeEach(() => {
  errorServicio = null;
  ultimaLlamada = null;
});

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
    userRepositoryPath,
    authPath,
    servicePath,
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
  conversationId = 3,
  body = { messageId: 10 },
  token = 'valido',
} = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${baseUrl}/api/chat/conversations/${conversationId}/read`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    }
  );

  return {
    status: response.status,
    json: await response.json(),
  };
}

test('HTTP 200: actualiza marcador de lectura', async () => {
  const response = await request();

  assert.equal(response.status, 200);
  assert.equal(response.json.success, true);

  assert.equal(
    response.json.message,
    'Marcador de lectura actualizado.'
  );

  assert.deepEqual(response.json.data, {
    conversationId: 3,
    lastReadMessageId: 10,
    lastReadAt: '2026-11-03T20:00:00.000Z',
  });

  assert.deepEqual(ultimaLlamada, {
    conversationId: 3,
    datos: { messageId: 10 },
    user: { id: 1 },
  });
});

test('HTTP 401: rechaza solicitud sin token', async () => {
  const response = await request({ token: null });

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
  assert.equal(ultimaLlamada, null);
});

test('HTTP 401: rechaza token invalido', async () => {
  const response = await request({ token: 'incorrecto' });

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
  assert.equal(ultimaLlamada, null);
});

test('HTTP 400: rechaza identificador de mensaje invalido', async () => {
  errorServicio = httpError(
    400,
    'Identificador de mensaje invalido.'
  );

  const response = await request({
    body: { messageId: -1 },
  });

  assert.equal(response.status, 400);
  assert.equal(response.json.success, false);
  assert.equal(
    response.json.message,
    'Identificador de mensaje invalido.'
  );
});

test('HTTP 404: rechaza conversacion ajena', async () => {
  errorServicio = httpError(
    404,
    'Conversacion no encontrada.'
  );

  const response = await request({
    conversationId: 999,
  });

  assert.equal(response.status, 404);
  assert.equal(response.json.success, false);
});

test('HTTP 404: rechaza mensaje ajeno', async () => {
  errorServicio = httpError(
    404,
    'Mensaje no encontrado.'
  );

  const response = await request({
    body: { messageId: 999 },
  });

  assert.equal(response.status, 404);
  assert.equal(
    response.json.message,
    'Mensaje no encontrado.'
  );
});

test('HTTP 500: oculta detalles internos', async () => {
  errorServicio = new Error(
    'Error interno de base de datos'
  );

  const response = await request();

  assert.equal(response.status, 500);
  assert.equal(response.json.success, false);
  assert.equal(
    response.json.message,
    'Error interno del servidor.'
  );
});
