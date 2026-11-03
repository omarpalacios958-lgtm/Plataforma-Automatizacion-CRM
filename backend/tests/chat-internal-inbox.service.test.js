
const { test } = require('node:test');
const assert = require('node:assert/strict');

const service = require('../src/modules/chat/services/chat.service');
const repository = require('../src/modules/chat/repositories/chat.repository');

function mockRepository(overrides) {
  const originals = {};

  for (const [name, replacement] of Object.entries(overrides)) {
    originals[name] = repository[name];
    repository[name] = replacement;
  }

  return () => Object.assign(repository, originals);
}

const empleadoActivo = (id) => ({
  id,
  nombre: 'Empleado',
  apellido: 'Prueba',
  activo: true,
});

test('Directorio: rechaza identidad invalida', async () => {
  for (const usuario of [null, {}, { id: 0 }, { id: '1' }]) {
    await assert.rejects(
      service.listarEmpleadosDisponibles(usuario),
      { status: 401 }
    );
  }
});

test('Directorio: rechaza empleado inactivo', async () => {
  const restore = mockRepository({
    buscarEmpleadoActivo: async () => null,
    listarEmpleadosDisponibles: async () => {
      assert.fail('No debe consultar el directorio');
    },
  });

  try {
    await assert.rejects(
      service.listarEmpleadosDisponibles({ id: 1 }),
      { status: 403 }
    );
  } finally {
    restore();
  }
});

test('Directorio: lista empleados para un usuario activo', async () => {
  const expected = [
    { id: 2, nombre: 'Ana', apellido: 'Lopez' },
  ];

  let recibido;

  const restore = mockRepository({
    buscarEmpleadoActivo: async (id) => empleadoActivo(id),
    listarEmpleadosDisponibles: async (id) => {
      recibido = id;
      return expected;
    },
  });

  try {
    const result = await service.listarEmpleadosDisponibles({ id: 1 });

    assert.equal(recibido, 1);
    assert.deepEqual(result, expected);
  } finally {
    restore();
  }
});

test('Bandeja: rechaza identidad invalida', async () => {
  for (const usuario of [null, {}, { id: -1 }, { id: '2' }]) {
    await assert.rejects(
      service.listarConversacionesInternas(usuario),
      { status: 401 }
    );
  }
});

test('Bandeja: rechaza empleado inactivo', async () => {
  const restore = mockRepository({
    buscarEmpleadoActivo: async () => null,
    listarConversacionesInternas: async () => {
      assert.fail('No debe consultar conversaciones');
    },
  });

  try {
    await assert.rejects(
      service.listarConversacionesInternas({ id: 1 }),
      { status: 403 }
    );
  } finally {
    restore();
  }
});

test('Bandeja: lista conversaciones del empleado activo', async () => {
  const expected = [
    {
      id: 10,
      tipo: 'INTERNO_PRIVADO',
      nombre: null,
      participants: [],
    },
  ];

  let recibido;

  const restore = mockRepository({
    buscarEmpleadoActivo: async (id) => empleadoActivo(id),
    listarConversacionesInternas: async (id) => {
      recibido = id;
      return expected;
    },
  });

  try {
    const result = await service.listarConversacionesInternas({ id: 3 });

    assert.equal(recibido, 3);
    assert.deepEqual(result, expected);
  } finally {
    restore();
  }
});

test('Bandeja: permite una lista vacia', async () => {
  const restore = mockRepository({
    buscarEmpleadoActivo: async (id) => empleadoActivo(id),
    listarConversacionesInternas: async () => [],
  });

  try {
    const result = await service.listarConversacionesInternas({ id: 5 });
    assert.deepEqual(result, []);
  } finally {
    restore();
  }
});
