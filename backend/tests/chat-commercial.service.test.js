'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const repoPath = require.resolve('../src/modules/chat/repositories/commercial.repository');
const servicePath = require.resolve('../src/modules/chat/services/commercial.service');
let employee = { id: 2, activo: true, role: { nombre: 'Vendedor' } };
let conversation = { id: 3, tipo: 'COMERCIAL', estado: 'PENDIENTE', assignedAgentId: null };
let lastQuery;
let calls = 0;
const repo = {
  async buscarEmpleado(id) { return id === 2 ? employee : null; },
  async listar(query) { lastQuery = query; return { conversations: [conversation], nextCursor: null }; },
  async obtener(id) { return id === 3 ? conversation : null; },
  async asignar(id, agentId) {
    calls++;
    if (id !== 3) return { error: 'NOT_FOUND' };
    if (conversation.estado !== 'PENDIENTE' || conversation.assignedAgentId !== null) return { error: 'CONFLICT' };
    conversation = { ...conversation, estado: 'ASIGNADA', assignedAgentId: agentId };
    return { conversation };
  },
};
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
const service = require(servicePath);
const actor = { id: 2, role: 'Usuario' }; // El rol del JWT no se usa para autorizar.
test('rechaza identidad ausente o invalida', async () => {
  await assert.rejects(service.listar(null), { status: 401 });
  await assert.rejects(service.obtener({ id: 'x' }, 3), { status: 401 });
});
test('rechaza empleado inexistente, inactivo y rol Usuario', async () => {
  await assert.rejects(service.listar({ id: 999 }), { status: 403 });
  employee = { id: 2, activo: false, role: { nombre: 'Vendedor' } };
  await assert.rejects(service.listar(actor), { status: 403 });
  employee = { id: 2, activo: true, role: { nombre: 'Usuario' } };
  await assert.rejects(service.asignar(actor, 3), { status: 403 });
  employee = { id: 2, activo: true, role: { nombre: 'Vendedor' } };
});
test('autoriza Vendedor por rol actual de base de datos, no por JWT', async () => {
  const result = await service.listar(actor);
  assert.equal(result.conversations[0].id, 3);
  employee = { id: 2, activo: true, role: { nombre: 'Administrador' } };
  assert.equal((await service.obtener(actor, 3)).id, 3);
  employee = { id: 2, activo: true, role: { nombre: 'Vendedor' } };
});
test('valida limites, cursor, estado y agente', async () => {
  for (const q of [{ limit: '0' }, { limit: '101' }, { limit: '1.5' }, { cursor: 'abc' },
    { estado: 'INTERNO' }, { assignedAgentId: '-2' }]) {
    await assert.rejects(service.listar(actor, q), { status: 400 });
  }
  await service.listar(actor, { limit: '10', cursor: '15', estado: 'PENDIENTE', assignedAgentId: '2' });
  assert.deepEqual(lastQuery, { limit: 10, cursor: 15, estado: 'PENDIENTE', assignedAgentId: 2 });
});
test('rechaza ID invalido y conversacion inexistente', async () => {
  await assert.rejects(service.obtener(actor, 'abc'), { status: 400 });
  await assert.rejects(service.obtener(actor, 999), { status: 404 });
  await assert.rejects(service.asignar(actor, '0'), { status: 400 });
  await assert.rejects(service.asignar(actor, 999), { status: 404 });
});
test('asigna al agente autenticado y rechaza un segundo intento', async () => {
  const result = await service.asignar(actor, 3);
  assert.equal(result.assignedAgentId, 2);
  assert.equal(result.estado, 'ASIGNADA');
  await assert.rejects(service.asignar(actor, 3), { status: 409 });
  assert.equal(calls, 3); // Incluye la busqueda del ID inexistente.
});
