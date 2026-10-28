'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const repoPath = require.resolve('../src/modules/chat/repositories/visitor-conversation.repository');
const servicePath = require.resolve('../src/modules/chat/services/visitor-conversation.service');
const records = new Map();
const mock = {
  async abrirUnaSola(id) { if (!records.has(id)) { records.set(id, { id: 100 + id, tipo: 'COMERCIAL', estado: 'PENDIENTE' }); return { creada: true, conversacion: records.get(id) }; } return { creada: false, conversacion: records.get(id) }; },
  async listarPropias(id) { return records.has(id) ? [records.get(id)] : []; },
  async buscarPropia(id, conversationId) { const c = records.get(id); return c?.id === conversationId ? c : null; },
};
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: mock };
const service = require(servicePath);
test('rechaza identidad de visitante invalida', async () => { await assert.rejects(service.abrir(null), { status: 401 }); });
test('crea conversacion comercial pendiente', async () => { const r = await service.abrir(11); assert.equal(r.creada, true); assert.equal(r.conversacion.tipo, 'COMERCIAL'); assert.equal(r.conversacion.estado, 'PENDIENTE'); });
test('reutiliza conversacion existente', async () => { const r = await service.abrir(11); assert.equal(r.creada, false); assert.equal(r.conversacion.id, 111); });
test('cada visitante tiene su propia conversacion', async () => { const r = await service.abrir(12); assert.notEqual(r.conversacion.id, 111); });
test('lista solo conversaciones propias', async () => { assert.deepEqual((await service.listar(11)).map(x=>x.id), [111]); assert.deepEqual(await service.listar(13), []); });
test('consulta conversacion propia', async () => { assert.equal((await service.obtener(11, '111')).id, 111); });
test('oculta conversaciones ajenas', async () => { await assert.rejects(service.obtener(12, '111'), { status: 404 }); });
test('rechaza ID de conversacion invalido', async () => { await assert.rejects(service.obtener(11, 'abc'), { status: 400 }); });
