
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

const employees = [
  { id: 2, nombre: 'Ana', apellido: 'Lopez' },
];

const conversations = [
  {
    id: 10,
    tipo: 'INTERNO_PRIVADO',
    estado: 'EN_CURSO',
    nombre: null,
    participants: [],
  },
];

let errorServicio = null;
let ultimaLlamada = null;
let conversacionesSimuladas = null;

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

  async listarEmpleadosDisponibles(user) {
    ultimaLlamada = { metodo: 'employees', user: { id: user.id } };

    if (errorServicio) {
      throw errorServicio;
    }

    return employees;
  },

  async listarConversacionesInternas(user) {
    ultimaLlamada = { metodo: 'conversations', user: { id: user.id } };

    if (errorServicio) {
      throw errorServicio;
    }

    return conversacionesSimuladas ?? conversations;
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
  conversacionesSimuladas = null;
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

async function request(path, token = 'valido') {
  const headers = {};

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api/chat${path}`, {
    method: 'GET',
    headers,
  });

  return {
    status: response.status,
    json: await response.json(),
  };
}

test('HTTP 200: devuelve directorio de empleados', async () => {
  const response = await request('/employees');

  assert.equal(response.status, 200);
  assert.equal(response.json.success, true);
  assert.deepEqual(response.json.data, { employees });

  assert.deepEqual(ultimaLlamada, {
    metodo: 'employees',
    user: { id: 1 },
  });
});

test('HTTP 200: devuelve bandeja de conversaciones internas', async () => {
  const response = await request('/conversations');

  assert.equal(response.status, 200);
  assert.equal(response.json.success, true);
  assert.deepEqual(response.json.data, { conversations });

  assert.deepEqual(ultimaLlamada, {
    metodo: 'conversations',
    user: { id: 1 },
  });
});

test('HTTP 401: directorio rechaza solicitud sin token', async () => {
  const response = await request('/employees', null);

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
  assert.equal(ultimaLlamada, null);
});

test('HTTP 401: bandeja rechaza token invalido', async () => {
  const response = await request('/conversations', 'incorrecto');

  assert.equal(response.status, 401);
  assert.equal(response.json.success, false);
  assert.equal(ultimaLlamada, null);
});

test('HTTP 403: directorio rechaza empleado inactivo', async () => {
  errorServicio = httpError(
    403,
    'El usuario autenticado no esta activo.'
  );

  const response = await request('/employees');

  assert.equal(response.status, 403);
  assert.equal(
    response.json.message,
    'El usuario autenticado no esta activo.'
  );
});

test('HTTP 403: bandeja rechaza empleado inactivo', async () => {
  errorServicio = httpError(
    403,
    'El usuario autenticado no esta activo.'
  );

  const response = await request('/conversations');

  assert.equal(response.status, 403);
  assert.equal(response.json.success, false);
});

test('HTTP 500: oculta detalles de errores internos', async () => {
  errorServicio = new Error('Error interno de base de datos');

  const response = await request('/conversations');

  assert.equal(response.status, 500);
  assert.equal(response.json.success, false);
  assert.equal(
    response.json.message,
    'Error interno del servidor.'
  );
});

test('HTTP 200: conserva contadores y marcadores de lectura en la bandeja', async () => {
  const conversacionesEsperadas = [
    {
      id: 10,
      tipo: 'INTERNO_GRUPAL',
      estado: 'EN_CURSO',
      nombre: 'Equipo de ventas',
      participants: [
        {
          id: 1,
          userId: 1,
          rol: 'MIEMBRO',
          user: {
            id: 1,
            nombre: 'Empleado',
            apellido: 'Prueba',
          },
        },
      ],
      lastReadMessageId: 25,
      lastReadAt: '2026-11-03T10:00:00.000Z',
      unreadCount: 3,
    },
  ];

  conversacionesSimuladas = conversacionesEsperadas;

  const response = await request('/conversations');

  assert.equal(response.status, 200);
  assert.equal(response.json.success, true);

  assert.deepEqual(
    response.json.data,
    { conversations: conversacionesEsperadas }
  );

  assert.equal(
    response.json.data.conversations[0].unreadCount,
    3
  );

  assert.equal(
    response.json.data.conversations[0].lastReadMessageId,
    25
  );

  assert.equal(
    response.json.data.conversations[0].lastReadAt,
    '2026-11-03T10:00:00.000Z'
  );

  assert.deepEqual(ultimaLlamada, {
    metodo: 'conversations',
    user: { id: 1 },
  });
});
