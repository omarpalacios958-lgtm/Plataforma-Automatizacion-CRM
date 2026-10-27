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

const activo = (id) => ({ id, activo: true, nombre: 'Empleado', apellido: 'Prueba' });

test('Rechaza token sin ID valido', async () => {
  await assert.rejects(service.crearORecuperarPrivada({ recipientUserId: 2 }, {}), { status: 401 });
});

test('Rechaza destinatario invalido o igual al emisor', async () => {
  for (const recipientUserId of ['2', 0, -1, 1.5, null]) {
    await assert.rejects(service.crearORecuperarPrivada({ recipientUserId }, { id: 1 }), { status: 400 });
  }
  await assert.rejects(service.crearORecuperarPrivada({ recipientUserId: 1 }, { id: 1 }), { status: 400 });
});

test('Rechaza empleado emisor inactivo', async () => {
  const restore = mockRepository({ buscarEmpleadoActivo: async (id) => id === 1 ? null : activo(id) });
  try {
    await assert.rejects(service.crearORecuperarPrivada({ recipientUserId: 2 }, { id: 1 }), { status: 403 });
  } finally { restore(); }
});

test('Rechaza destinatario inactivo', async () => {
  const restore = mockRepository({ buscarEmpleadoActivo: async (id) => id === 2 ? null : activo(id) });
  try {
    await assert.rejects(service.crearORecuperarPrivada({ recipientUserId: 2 }, { id: 1 }), { status: 404 });
  } finally { restore(); }
});

test('Crea una conversacion con clave canonica', async () => {
  let recibido;
  const restore = mockRepository({
    buscarEmpleadoActivo: async (id) => activo(id),
    buscarPrivada: async () => null,
    crearPrivada: async (datos) => { recibido = datos; return { id: 12, ...datos }; },
  });
  try {
    const result = await service.crearORecuperarPrivada({ recipientUserId: 2 }, { id: 9 });
    assert.equal(result.creada, true);
    assert.equal(recibido.privatePairKey, '2:9');
    assert.equal(recibido.emisorId, 9);
  } finally { restore(); }
});

test('Reutiliza conversacion existente', async () => {
  const original = { id: 5 };
  const restore = mockRepository({
    buscarEmpleadoActivo: async (id) => activo(id),
    buscarPrivada: async () => original,
    crearPrivada: async () => assert.fail('No debe crear otra conversacion'),
  });
  try {
    const result = await service.crearORecuperarPrivada({ recipientUserId: 9 }, { id: 2 });
    assert.deepEqual(result, { creada: false, conversacion: original });
  } finally { restore(); }
});

test('Recupera conversacion tras colision de unicidad P2002', async () => {
  const original = { id: 8 };
  let consultas = 0;
  const restore = mockRepository({
    buscarEmpleadoActivo: async (id) => activo(id),
    buscarPrivada: async () => (++consultas === 1 ? null : original),
    crearPrivada: async () => { const e = new Error('Unique constraint'); e.code = 'P2002'; throw e; },
  });
  try {
    const result = await service.crearORecuperarPrivada({ recipientUserId: 2 }, { id: 1 });
    assert.deepEqual(result, { creada: false, conversacion: original });
  } finally { restore(); }
});
