'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const service = require('../src/modules/chat/services/chat.service');
const repo = require('../src/modules/chat/repositories/chat.repository');

const usuario = { id: 1 };

function mock(methods) {
  const originales = {};

  for (const [nombre, implementacion] of Object.entries(methods)) {
    originales[nombre] = repo[nombre];
    repo[nombre] = implementacion;
  }

  return () => Object.assign(repo, originales);
}

test('rechaza identidad y conversacion invalidas', async () => {
  await assert.rejects(
    service.marcarComoLeido(1, { messageId: 10 }, {}),
    { status: 401 }
  );

  await assert.rejects(
    service.marcarComoLeido(0, { messageId: 10 }, usuario),
    { status: 400 }
  );
});

test('rechaza participante ajeno o inactivo', async () => {
  const restore = mock({
    buscarParticipanteActivo: async () => null,
    marcarComoLeido: async () =>
      assert.fail('No debe actualizar un participante ajeno'),
  });

  try {
    await assert.rejects(
      service.marcarComoLeido(3, { messageId: 10 }, usuario),
      { status: 404 }
    );
  } finally {
    restore();
  }
});

test('rechaza identificador de mensaje invalido', async () => {
  const restore = mock({
    buscarParticipanteActivo: async () => ({ id: 5 }),
    marcarComoLeido: async () =>
      assert.fail('No debe actualizar con datos invalidos'),
  });

  try {
    for (const messageId of [0, -1, '10', null, 1.5]) {
      await assert.rejects(
        service.marcarComoLeido(3, { messageId }, usuario),
        { status: 400 }
      );
    }
  } finally {
    restore();
  }
});

test('actualiza marcador del participante autorizado', async () => {
  let parametros;

  const marcador = {
    conversationId: 3,
    lastReadMessageId: 10,
    lastReadAt: new Date('2026-11-03T20:00:00.000Z'),
  };

  const restore = mock({
    buscarParticipanteActivo: async () => ({ id: 5 }),
    marcarComoLeido: async (datos) => {
      parametros = datos;
      return marcador;
    },
  });

  try {
    const resultado = await service.marcarComoLeido(
      3,
      { messageId: 10 },
      usuario
    );

    assert.deepEqual(parametros, {
      conversationId: 3,
      participantId: 5,
      messageId: 10,
    });

    assert.deepEqual(resultado, marcador);
  } finally {
    restore();
  }
});

test('devuelve 404 si el mensaje no pertenece a la conversacion', async () => {
  const restore = mock({
    buscarParticipanteActivo: async () => ({ id: 5 }),
    marcarComoLeido: async () => ({ error: 'MESSAGE_NOT_FOUND' }),
  });

  try {
    await assert.rejects(
      service.marcarComoLeido(3, { messageId: 10 }, usuario),
      { status: 404 }
    );
  } finally {
    restore();
  }
});

test('rechaza cambios de membresia detectados durante la actualizacion', async () => {
  const restore = mock({
    buscarParticipanteActivo: async () => ({ id: 5 }),
    marcarComoLeido: async () => ({ error: 'PARTICIPANT_NOT_FOUND' }),
  });

  try {
    await assert.rejects(
      service.marcarComoLeido(3, { messageId: 10 }, usuario),
      { status: 404 }
    );
  } finally {
    restore();
  }
});