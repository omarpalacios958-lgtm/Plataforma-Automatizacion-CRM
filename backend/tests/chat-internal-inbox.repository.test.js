
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const repositoryPath = require.resolve(
  '../src/modules/chat/repositories/chat.repository'
);
const databasePath = require.resolve(
  '../src/config/database'
);

function cargarRepositorio(prismaMock) {
  const databaseAnterior = require.cache[databasePath];
  const repositoryAnterior = require.cache[repositoryPath];

  const moduloDatabase = new Module(databasePath);
  moduloDatabase.filename = databasePath;
  moduloDatabase.loaded = true;
  moduloDatabase.exports = prismaMock;

  require.cache[databasePath] = moduloDatabase;
  delete require.cache[repositoryPath];

  try {
    return require(repositoryPath);
  } finally {
    if (databaseAnterior) {
      require.cache[databasePath] = databaseAnterior;
    } else {
      delete require.cache[databasePath];
    }

    if (repositoryAnterior) {
      require.cache[repositoryPath] = repositoryAnterior;
    } else {
      delete require.cache[repositoryPath];
    }
  }
}

test('Directorio: consulta solo empleados activos y excluye al usuario', async () => {
  let consulta;

  const repository = cargarRepositorio({
    user: {
      findMany: async (argumentos) => {
        consulta = argumentos;
        return [
          { id: 2, nombre: 'Ana', apellido: 'López' },
        ];
      },
    },
  });

  const resultado = await repository.listarEmpleadosDisponibles(1);

  assert.deepEqual(resultado, [
    { id: 2, nombre: 'Ana', apellido: 'López' },
  ]);

  assert.deepEqual(consulta.where, {
    activo: true,
    id: { not: 1 },
  });

  assert.deepEqual(consulta.select, {
    id: true,
    nombre: true,
    apellido: true,
  });

  assert.deepEqual(consulta.orderBy, [
    { apellido: 'asc' },
    { nombre: 'asc' },
    { id: 'asc' },
  ]);

  assert.equal(consulta.select.password, undefined);
  assert.equal(consulta.select.correo, undefined);
});

test('Bandeja: filtra conversaciones internas por membresia activa', async () => {
  let consulta;

  const repository = cargarRepositorio({
    chatConversation: {
      findMany: async (argumentos) => {
        consulta = argumentos;
        return [
          {
            id: 10,
            tipo: 'INTERNO_PRIVADO',
            nombre: null,
            participants: [],
          },
        ];
      },
    },
  });

  const resultado = await repository.listarConversacionesInternas(1);

  assert.equal(resultado.length, 1);

  assert.deepEqual(consulta.where, {
    tipo: {
      in: ['INTERNO_PRIVADO', 'INTERNO_GRUPAL'],
    },
    participants: {
      some: {
        userId: 1,
        leftAt: null,
        user: { activo: true },
      },
    },
  });

  assert.deepEqual(consulta.orderBy, [
    { createdAt: 'desc' },
    { id: 'desc' },
  ]);
});

test('Bandeja: selecciona solo datos publicos y participantes activos', async () => {
  let consulta;

  const repository = cargarRepositorio({
    chatConversation: {
      findMany: async (argumentos) => {
        consulta = argumentos;
        return [];
      },
    },
  });

  await repository.listarConversacionesInternas(5);

  assert.deepEqual(consulta.select.participants.where, {
    leftAt: null,
    user: { activo: true },
  });

  assert.deepEqual(
    consulta.select.participants.select.user.select,
    {
      id: true,
      nombre: true,
      apellido: true,
    }
  );

  assert.equal(consulta.select.privatePairKey, undefined);
  assert.equal(consulta.select.participants.select.user.select.password, undefined);
  assert.equal(consulta.select.participants.select.user.select.correo, undefined);
});

test('Bandeja: permite una respuesta vacia sin errores', async () => {
  const repository = cargarRepositorio({
    chatConversation: {
      findMany: async () => [],
    },
  });

  const resultado = await repository.listarConversacionesInternas(9);

  assert.deepEqual(resultado, []);
});
