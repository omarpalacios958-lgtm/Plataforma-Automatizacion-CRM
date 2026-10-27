const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/modules/chat/services/chat.service');
const repo = require('../src/modules/chat/repositories/chat.repository');
const user = { id: 1 };
const payload = { contenido: 'Hola', clientMessageId: 'msg_00000001' };
function mock(methods) {
  const old = {};
  for (const [key, value] of Object.entries(methods)) { old[key] = repo[key]; repo[key] = value; }
  return () => Object.assign(repo, old);
}

test('Rechaza identidad invalida y conversacion invalida', async () => {
  await assert.rejects(service.enviarMensaje(1, payload, {}), { status: 401 });
  await assert.rejects(service.enviarMensaje(0, payload, user), { status: 400 });
});

test('Rechaza empleado ajeno o inactivo sin consultar mensajes', async () => {
  const restore = mock({ buscarParticipanteActivo: async () => null,
    buscarMensajePorClave: async () => assert.fail('No debe consultar mensajes') });
  try { await assert.rejects(service.enviarMensaje(1, payload, user), { status: 404 }); }
  finally { restore(); }
});

test('Rechaza contenido vacio, largo y clave invalida', async () => {
  const restore = mock({ buscarParticipanteActivo: async () => ({ id: 5 }) });
  try {
    for (const datos of [
      { ...payload, contenido: '  ' },
      { ...payload, contenido: 'x'.repeat(10001) },
      { ...payload, clientMessageId: 'x' },
    ]) await assert.rejects(service.enviarMensaje(1, datos, user), { status: 400 });
  } finally { restore(); }
});

test('Crea mensaje con identidad del participante autorizado', async () => {
  let datos;
  const restore = mock({ buscarParticipanteActivo: async () => ({ id: 5 }),
    buscarMensajePorClave: async () => null,
    crearMensaje: async (value) => { datos = value; return { id: 10, ...value }; } });
  try {
    const result = await service.enviarMensaje(1, { ...payload, contenido: ' Hola ' }, user);
    assert.equal(result.creado, true);
    assert.deepEqual(datos, { conversationId: 1, participantId: 5,
      contenido: 'Hola', clientMessageId: 'msg_00000001' });
  } finally { restore(); }
});

test('Reintento identico devuelve mensaje sin duplicar', async () => {
  const existing = { id: 10, conversationId: 1, contenido: 'Hola' };
  const restore = mock({ buscarParticipanteActivo: async () => ({ id: 5 }),
    buscarMensajePorClave: async () => existing,
    crearMensaje: async () => assert.fail('No debe crear duplicado') });
  try { assert.deepEqual(await service.enviarMensaje(1, payload, user),
    { creado: false, mensaje: existing }); }
  finally { restore(); }
});

test('Reutilizar clave con contenido diferente devuelve 409', async () => {
  const restore = mock({ buscarParticipanteActivo: async () => ({ id: 5 }),
    buscarMensajePorClave: async () => ({ id: 10, conversationId: 1, contenido: 'Distinto' }) });
  try { await assert.rejects(service.enviarMensaje(1, payload, user), { status: 409 }); }
  finally { restore(); }
});

test('Resuelve colision concurrente P2002', async () => {
  let calls = 0;
  const existing = { id: 10, conversationId: 1, contenido: 'Hola' };
  const restore = mock({ buscarParticipanteActivo: async () => ({ id: 5 }),
    buscarMensajePorClave: async () => (++calls === 1 ? null : existing),
    crearMensaje: async () => { const error = new Error('unique'); error.code = 'P2002'; throw error; } });
  try { assert.deepEqual(await service.enviarMensaje(1, payload, user),
    { creado: false, mensaje: existing }); }
  finally { restore(); }
});

test('Paginacion y acceso autorizado', async () => {
  let args;
  const restore = mock({ buscarParticipanteActivo: async () => ({ id: 5 }),
    listarMensajes: async (params) => { args = params; return { messages: [], nextCursor: null }; } });
  try {
    await service.obtenerMensajes(1, { cursor: '30', limit: '10' }, user);
    assert.deepEqual(args, { conversationId: 1, cursor: 30, limit: 10 });
    await service.obtenerMensajes(1, {}, user);
    assert.deepEqual(args, { conversationId: 1, cursor: null, limit: 20 });
    for (const query of [{ limit: '0' }, { limit: '51' }, { cursor: 'abc' }]) {
      await assert.rejects(service.obtenerMensajes(1, query, user), { status: 400 });
    }
  } finally { restore(); }
});
