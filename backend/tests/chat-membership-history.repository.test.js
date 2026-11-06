'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const repositoryPath = require.resolve('../src/modules/chat/repositories/chat.repository');
const originalDatabase = require.cache[databasePath];
const originalRepository = require.cache[repositoryPath];

const ingreso = new Date('2026-11-06T10:00:00.000Z');
const messages = [
  { id: 1, conversationId: 7, createdAt: new Date('2026-11-06T09:00:00.000Z') },
  { id: 2, conversationId: 7, createdAt: new Date('2026-11-06T09:30:00.000Z') },
  { id: 3, conversationId: 7, createdAt: ingreso },
  { id: 4, conversationId: 7, createdAt: new Date('2026-11-06T10:01:00.000Z') },
  { id: 5, conversationId: 7, createdAt: new Date('2026-11-06T10:02:00.000Z') },
  { id: 6, conversationId: 7, createdAt: new Date('2026-11-06T10:03:00.000Z') },
];
let member = { joinedAt: ingreso, conversation: { tipo: 'INTERNO_GRUPAL' } };
let lastQuery;
let transactions = 0;
const prismaMock = {
  chatParticipant: {
    async findFirst(query) {
      assert.equal(query.where.conversationId, 7);
      assert.equal(query.where.userId, 11);
      assert.equal(query.where.leftAt, null);
      return member;
    },
  },
  chatMessage: {
    async findMany(query) {
      lastQuery = query;
      let result = messages.filter((m) => m.conversationId === query.where.conversationId);
      if (query.where.createdAt?.gt) result = result.filter((m) => m.createdAt > query.where.createdAt.gt);
      if (query.where.id?.gt !== undefined) result = result.filter((m) => m.id > query.where.id.gt);
      if (query.where.id?.lt !== undefined) result = result.filter((m) => m.id < query.where.id.lt);
      result.sort((a,b) => query.orderBy.id === 'asc' ? a.id-b.id : b.id-a.id);
      return result.slice(0, query.take);
    },
  },
  async $transaction(callback, options) {
    transactions++;
    assert.equal(options.isolationLevel, 'Serializable');
    return callback(this);
  },
};
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: prismaMock };
delete require.cache[repositoryPath];
const repository = require(repositoryPath);

test.after(() => {
  if (originalDatabase) require.cache[databasePath] = originalDatabase;
  else delete require.cache[databasePath];
  if (originalRepository) require.cache[repositoryPath] = originalRepository;
  else delete require.cache[repositoryPath];
});

test('Grupo: excluye historial previo e instante de ingreso', async () => {
  member = { joinedAt: ingreso, conversation: { tipo: 'INTERNO_GRUPAL' } };
  const result = await repository.listarMensajesInternos({ conversationId: 7, userId: 11, limit: 10, cursor: null });
  assert.deepEqual(result.messages.map(m => m.id), [6,5,4]);
  assert.deepEqual(lastQuery.where.createdAt, { gt: ingreso });
  assert.equal(result.nextCursor, null);
});

test('Grupo: cursor y afterId respetan la reincorporacion', async () => {
  member = { joinedAt: ingreso, conversation: { tipo: 'INTERNO_GRUPAL' } };
  const historic = await repository.listarMensajesInternos({ conversationId: 7, userId: 11, limit: 2, cursor: 5 });
  assert.deepEqual(historic.messages.map(m => m.id), [4]);
  const incremental = await repository.listarMensajesInternos({ conversationId: 7, userId: 11, limit: 2, afterId: 0, cursor: null });
  assert.deepEqual(incremental.messages.map(m => m.id), [4,5]);
  assert.equal(incremental.nextCursor, 5);
});

test('Participante retirado: no consulta mensajes', async () => {
  member = null;
  lastQuery = null;
  const result = await repository.listarMensajesInternos({ conversationId: 7, userId: 11, limit: 10, cursor: null });
  assert.deepEqual(result, { error: 'PARTICIPANT_NOT_FOUND' });
  assert.equal(lastQuery, null);
});

test('Privado: mantiene historial completo', async () => {
  member = { joinedAt: ingreso, conversation: { tipo: 'INTERNO_PRIVADO' } };
  const result = await repository.listarMensajesInternos({ conversationId: 7, userId: 11, limit: 10, cursor: null });
  assert.deepEqual(result.messages.map(m => m.id), [6,5,4,3,2,1]);
  assert.equal(lastQuery.where.createdAt, undefined);
});

test('Llamada compartida sin membresia mantiene contrato comercial/visitante', async () => {
  const result = await repository.listarMensajes({ conversationId: 7, limit: 10, cursor: null });
  assert.deepEqual(result.messages.map(m => m.id), [6,5,4,3,2,1]);
  assert.equal(lastQuery.where.createdAt, undefined);
  assert.ok(transactions >= 4);
});
