'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validarLectura,
} = require('../src/modules/chat/validations/chat.validation');

test('acepta un identificador de mensaje positivo', () => {
  assert.equal(validarLectura({ messageId: 1 }), 1);
  assert.equal(validarLectura({ messageId: 150 }), 150);
  assert.equal(
    validarLectura({ messageId: Number.MAX_SAFE_INTEGER }),
    Number.MAX_SAFE_INTEGER
  );
});

test('rechaza identificadores de mensaje invalidos', () => {
  const invalidos = [
    0,
    -1,
    1.5,
    '1',
    null,
    undefined,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ];

  for (const messageId of invalidos) {
    assert.throws(
      () => validarLectura({ messageId }),
      { status: 400 },
      `Debia rechazar messageId=${String(messageId)}`
    );
  }
});

test('rechaza cuerpos de solicitud invalidos', () => {
  const cuerposInvalidos = [
    null,
    undefined,
    [],
    'texto',
    10,
    {},
    { otroCampo: 5 },
  ];

  for (const cuerpo of cuerposInvalidos) {
    assert.throws(
      () => validarLectura(cuerpo),
      { status: 400 }
    );
  }
});

test('no modifica el cuerpo original', () => {
  const cuerpo = Object.freeze({ messageId: 25 });

  assert.equal(validarLectura(cuerpo), 25);
  assert.deepEqual(cuerpo, { messageId: 25 });
});