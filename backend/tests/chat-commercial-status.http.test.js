
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

const jwtPath = require.resolve('../src/utils/jwt');
const servicePath = require.resolve(
  '../src/modules/chat/services/commercial.service'
);
const controllerPath = require.resolve(
  '../src/modules/chat/controllers/commercial.controller'
);
const routesPath = require.resolve(
  '../src/modules/chat/routes/commercial.routes'
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

let resultadoServicio = {
  id: 3,
  tipo: 'COMERCIAL',
  estado: 'EN_CURSO',
  assignedAgentId: 2,
};

let errorServicio = null;
let ultimaLlamada = null;

mockModule(jwtPath, {
  verificarToken(token) {
    if (token === 'valido') {
      return { id: 2 };
    }

    throw new Error('Token invalido');
  },
});

mockModule(servicePath, {
  async cambiarEstado(user, conversationId, body) {
    ultimaLlamada = { user, conversationId, body };

    if (errorServicio) {
      throw errorServicio;
    }

    return resultadoServicio;
  },
});

delete require.cache[authPath];
delete require.cache[controllerPath];
delete require.cache[routesPath];

const commercialRoutes = require(routesPath);

const app = express();
app.disable('etag');
app.use(express.json());
app.use('/api/chat/commercial', commercialRoutes);

app.use((error, req, res, next) => {
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    'body' in error
  ) {
    return res.status(400).json({
      success: false,
      message: 'El JSON enviado no es valido.',
    });
  }

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
  token = 'valido',
  conversationId = 3,
  body = { estado: 'EN_CURSO' },
} = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${baseUrl}/api/chat/commercial/conversations/${conversationId}/status`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    }
  );

  return {
    status: response.status,
    headers: response.headers,
    json: await response.json(),
  };
}

test('HTTP 200: cambia estado y devuelve conversacion', async () => {
  const response = await request();

  assert.equal(response.status, 200);
  assert.equal(response.json.success, true);
  assert.deepEqual(response.json.data, resultadoServicio);
  assert.equal(
    response.headers.get('cache-control'),
    'no-store'
  );

  assert.deepEqual(ultimaLlamada, {
    user: { id: 2 },
    conversationId: '3',
    body: { estado: 'EN_CURSO' },
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

test('HTTP 400: propaga error de validacion', async () => {
  errorServicio = httpError(400, 'Estado de destino invalido.');

  const response = await request({
    body: { estado: 'PENDIENTE' },
  });

  assert.equal(response.status, 400);
  assert.equal(response.json.success, false);
  assert.equal(
    response.json.message,
    'Estado de destino invalido.'
  );
});

test('HTTP 403: propaga falta de permisos', async () => {
  errorServicio = httpError(403, 'Sin permisos.');

  const response = await request();

  assert.equal(response.status, 403);
  assert.equal(response.json.message, 'Sin permisos.');
});

test('HTTP 404: oculta conversacion ajena', async () => {
  errorServicio = httpError(
    404,
    'Conversacion comercial no encontrada.'
  );

  const response = await request({ conversationId: 999 });

  assert.equal(response.status, 404);
  assert.equal(response.json.success, false);
});

test('HTTP 409: rechaza transicion invalida', async () => {
  errorServicio = httpError(
    409,
    'La conversacion no permite esta transicion de estado.'
  );

  const response = await request({
    body: { estado: 'RESUELTA' },
  });

  assert.equal(response.status, 409);
  assert.equal(response.json.success, false);
});
