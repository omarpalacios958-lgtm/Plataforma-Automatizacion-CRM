const { test } = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/modules/chat/services/chat.service');
const repo = require('../src/modules/chat/repositories/chat.repository');
function mock(fn) { const old = repo.modificarMembresia; repo.modificarMembresia = fn; return () => { repo.modificarMembresia = old; }; }
const user = { id: 1 };
test('Miembros: rechaza identidad e ID de grupo invalidos', async () => {
  await assert.rejects(service.administrarMiembroGrupo(2, {userId: 3}, {}, 'AGREGAR'), {status:401});
  await assert.rejects(service.administrarMiembroGrupo(0, {userId: 3}, user, 'AGREGAR'), {status:400});
});
test('Miembros: valida ID objetivo y auto invitacion', async () => {
  await assert.rejects(service.administrarMiembroGrupo(2, {userId:'3'}, user, 'AGREGAR'), {status:400});
  await assert.rejects(service.administrarMiembroGrupo(2, {userId:1}, user, 'AGREGAR'), {status:400});
});
test('Miembros: agrega empleado con parametros esperados', async () => {
  const restore = mock(async (arg) => { assert.deepEqual(arg, {conversationId:2,actorId:1,targetId:3,accion:'AGREGAR'}); return {participante:{id:8}}; });
  try { assert.deepEqual(await service.administrarMiembroGrupo(2,{userId:3},user,'AGREGAR'),{id:8}); } finally {restore();}
});
test('Miembros: permite retirar a otro empleado', async () => {
  const restore = mock(async (arg) => { assert.equal(arg.accion,'RETIRAR'); assert.equal(arg.targetId,3); return {participante:{id:8}}; });
  try { await service.administrarMiembroGrupo(2,{userId:3},user,'RETIRAR'); } finally {restore();}
});
test('Miembros: salir siempre afecta al usuario autenticado', async () => {
  const restore = mock(async (arg) => { assert.equal(arg.accion,'SALIR'); assert.equal(arg.targetId,1); return {participante:{id:8}}; });
  try { await service.administrarMiembroGrupo(2,{userId:3},user,'SALIR'); } finally {restore();}
});
test('Miembros: traduce errores de autorizacion y ultimo administrador', async () => {
  for (const [code,status] of [['NOT_FOUND',404],['FORBIDDEN',403],['EMPLOYEE_NOT_FOUND',404],['ALREADY_MEMBER',409],['NOT_MEMBER',404],['LAST_ADMIN',409]]) {
    const restore = mock(async () => ({error:code}));
    try { await assert.rejects(service.administrarMiembroGrupo(2,{userId:3},user,'RETIRAR'), {status}); } finally {restore();}
  }
});
