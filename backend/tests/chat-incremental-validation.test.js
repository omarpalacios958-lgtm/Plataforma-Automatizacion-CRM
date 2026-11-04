
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validarPaginacion,
} = require("../src/modules/chat/validations/chat.validation");

test("mantiene paginacion tradicional sin afterId", () => {
  assert.deepEqual(
    validarPaginacion({ limit: "10", cursor: "30" }),
    { limit: 10, cursor: 30 },
  );

  assert.deepEqual(
    validarPaginacion({}),
    { limit: 20, cursor: null },
  );
});

test("acepta afterId positivo", () => {
  assert.deepEqual(
    validarPaginacion({ limit: "20", afterId: "40" }),
    { limit: 20, cursor: null, afterId: 40 },
  );
});

test("acepta afterId cero para sincronizacion inicial", () => {
  assert.deepEqual(
    validarPaginacion({ afterId: "0" }),
    { limit: 20, cursor: null, afterId: 0 },
  );
});

test("rechaza cursor y afterId simultaneos", () => {
  assert.throws(
    () =>
      validarPaginacion({
        cursor: "20",
        afterId: "40",
      }),
    { status: 400 },
  );
});

test("rechaza afterId invalido", () => {
  for (const afterId of [
    "-1",
    "abc",
    "1.5",
    "",
    "9007199254740992",
  ]) {
    assert.throws(
      () => validarPaginacion({ afterId }),
      { status: 400 },
    );
  }
});

test("mantiene los limites de paginacion", () => {
  for (const limit of ["0", "51", "abc"]) {
    assert.throws(
      () => validarPaginacion({ limit }),
      { status: 400 },
    );
  }
});
