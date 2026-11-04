
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../src/config/database');
const repositoryPath = require.resolve(
  '../src/modules/chat/repositories/chat.repository'
);

const originalDatabase = require.cache[databasePath];
const originalRepository = require.cache[repositoryPath];

const calls = [];
let storedMessages = [];

const prismaMock = {
  chatMessage: {
    async findMany(query) {
      calls.push(query);

      let result = storedMessages.filter(
        (message) => message.conversationId === query.where.conversationId
      );

      if (query.where.id?.gt !== undefined) {
        result = result.filter(
          (message) => message.id > query.where.id.gt
        );
      }

      if (query.where.id?.lt !== undefined) {
        result = result.filter(
          (message) => message.id < query.where.id.lt
        );
      }

      result.sort((a, b) =>
        query.orderBy.id === 'asc' ? a.id - b.id : b.id - a.id
      );

      return result.slice(0, query.take);
    },
  },
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: prismaMock,
};

delete require.cache[repositoryPath];
const repository = require(repositoryPath);

test.after(() => {
  if (originalDatabase) {
    require.cache[databasePath] = originalDatabase;
  } else {
    delete require.cache[databasePath];
  }

  if (originalRepository) {
    require.cache[repositoryPath] = originalRepository;
  } else {
    delete require.cache[repositoryPath];
  }
});

function seed(total, conversationId = 3) {
  storedMessages = Array.from({ length: total }, (_, index) => ({
    id: index + 1,
    conversationId,
    participantId: 20,
    contenido: `Mensaje ${index + 1}`,
    clientMessageId: `message_${index + 1}`,
  }));

  calls.length = 0;
}

test('consulta incremental usa gt y orden ascendente', async () => {
  seed(10);

  const result = await repository.listarMensajes({
    conversationId: 3,
    limit: 3,
    afterId: 4,
    cursor: null,
  });

  assert.deepEqual(
    result.messages.map((message) => message.id),
    [5, 6, 7]
  );

  assert.equal(result.nextCursor, 7);
  assert.deepEqual(calls[0].where, {
    conversationId: 3,
    id: { gt: 4 },
  });
  assert.deepEqual(calls[0].orderBy, { id: 'asc' });
  assert.equal(calls[0].take, 4);
});

test('recupera todos los mensajes nuevos en varios lotes', async () => {
  seed(55);

  const recovered = [];
  let afterId = 5;

  for (let page = 0; page < 10; page++) {
    const result = await repository.listarMensajes({
      conversationId: 3,
      limit: 20,
      afterId,
      cursor: null,
    });

    recovered.push(...result.messages.map((message) => message.id));

    if (result.nextCursor === null) break;

    afterId = result.nextCursor;
  }

  assert.deepEqual(
    recovered,
    Array.from({ length: 50 }, (_, index) => index + 6)
  );

  assert.equal(calls.length, 3);
});

test('consulta incremental vacia no devuelve cursor', async () => {
  seed(10);

  const result = await repository.listarMensajes({
    conversationId: 3,
    limit: 20,
    afterId: 10,
    cursor: null,
  });

  assert.deepEqual(result, {
    messages: [],
    nextCursor: null,
  });
});

test('consulta tradicional conserva orden descendente', async () => {
  seed(10);

  const result = await repository.listarMensajes({
    conversationId: 3,
    limit: 3,
    cursor: 8,
  });

  assert.deepEqual(
    result.messages.map((message) => message.id),
    [7, 6, 5]
  );

  assert.equal(result.nextCursor, 5);
  assert.deepEqual(calls[0].where, {
    conversationId: 3,
    id: { lt: 8 },
  });
  assert.deepEqual(calls[0].orderBy, { id: 'desc' });
});

test('no mezcla mensajes de otras conversaciones', async () => {
  seed(5);

  storedMessages.push({
    id: 100,
    conversationId: 4,
    participantId: 30,
    contenido: 'Mensaje ajeno',
    clientMessageId: 'other_message',
  });

  const result = await repository.listarMensajes({
    conversationId: 3,
    limit: 20,
    afterId: 2,
    cursor: null,
  });

  assert.deepEqual(
    result.messages.map((message) => message.id),
    [3, 4, 5]
  );
});
