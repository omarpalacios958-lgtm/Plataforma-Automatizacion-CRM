const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/modules/chat/services/chat.service');
const repo = require('../src/modules/chat/repositories/chat.repository');
function mock(methods) {
  const previous = {};
  for (const [name, method] of Object.entries(methods)) {
    previous[name] = repo[name]; repo[name] = method;
  }
  return () => Object.assign(repo, previous);
}
const datos = { nombre: ' Equipo comercial ', participantUserIds: [2, 3] };
const user = { id: 1 };

test('Grupo: rechaza token sin ID valido', async () => {
  await assert.rejects(service.crearGrupo(datos, {}), { status: 401 });
});
test('Grupo: valida nombre, minimo, duplicados y creador repetido', async () => {
  for (const value of [
    { ...datos, nombre: ' ' }, { ...datos, nombre: 'x'.repeat(121) },
    { ...datos, participantUserIds: [] },
    { ...datos, participantUserIds: [2, 2] },
    { ...datos, participantUserIds: [1, 2] },
    { ...datos, participantUserIds: [2, '3'] },
  ]) await assert.rejects(service.crearGrupo(value, user), { status: 400 });
});
test('Grupo: impide crear si el creador esta inactivo', async () => {
  const restore = mock({ buscarEmpleadosActivos: async () => [{ id: 2 }, { id: 3 }],
    crearGrupo: async () => assert.fail('No crear') });
  try { await assert.rejects(service.crearGrupo(datos, user), { status: 403 }); }
  finally { restore(); }
});
test('Grupo: impide invitar usuarios inexistentes o inactivos', async () => {
  const restore = mock({ buscarEmpleadosActivos: async () => [{ id: 1 }, { id: 2 }],
    crearGrupo: async () => assert.fail('No crear') });
  try { await assert.rejects(service.crearGrupo(datos, user), { status: 404 }); }
  finally { restore(); }
});
test('Grupo: crea con nombre normalizado e IDs de invitados', async () => {
  let received;
  const restore = mock({ buscarEmpleadosActivos: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    crearGrupo: async (input) => { received = input; return { id: 8, ...input }; } });
  try {
    const result = await service.crearGrupo(datos, user);
    assert.equal(result.id, 8);
    assert.deepEqual(received, { nombre: 'Equipo comercial', creadorId: 1, participantUserIds: [2, 3] });
  } finally { restore(); }
});
test('Grupo: rechaza consulta con ID invalido', async () => {
  await assert.rejects(service.obtenerParticipantesGrupo(0, user), { status: 400 });
});
test('Grupo: oculta grupos ajenos, privados o miembros inactivos', async () => {
  const restore = mock({ buscarMiembroGrupoActivo: async () => null,
    listarParticipantesGrupo: async () => assert.fail('No listar') });
  try { await assert.rejects(service.obtenerParticipantesGrupo(9, user), { status: 404 }); }
  finally { restore(); }
});
test('Grupo: lista participantes solo con membresia autorizada', async () => {
  const expected = [{ id: 1, userId: 1, rol: 'ADMINISTRADOR' }];
  const restore = mock({ buscarMiembroGrupoActivo: async () => ({ id: 1, rol: 'ADMINISTRADOR' }),
    listarParticipantesGrupo: async (id) => { assert.equal(id, 9); return expected; } });
  try { assert.deepEqual(await service.obtenerParticipantesGrupo(9, user), expected); }
  finally { restore(); }
});
