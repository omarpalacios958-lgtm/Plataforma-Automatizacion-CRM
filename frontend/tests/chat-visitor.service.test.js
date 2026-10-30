
import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  obtenerTokenVisitante,
  eliminarTokenVisitante,
  crearSesionVisitante,
  consultarSesionVisitante,
  abrirConversacionVisitante,
  listarConversacionesVisitante,
  obtenerConversacionVisitante,
  enviarMensajeVisitante,
  listarMensajesVisitante,
  cerrarSesionVisitante,
} from "../src/services/chat-visitor.service.js";

const TOKEN_VISITANTE = "v".repeat(43);
const TOKEN_EMPLEADO = "jwt-empleado-no-debe-enviarse";

let solicitudes;
let almacenamiento;

function responder(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return data;
    },
  };
}

beforeEach(() => {
  solicitudes = [];
  almacenamiento = new Map();

  globalThis.sessionStorage = {
    getItem(key) {
      return almacenamiento.get(key) ?? null;
    },
    setItem(key, value) {
      almacenamiento.set(key, String(value));
    },
    removeItem(key) {
      almacenamiento.delete(key);
    },
  };

  globalThis.localStorage = {
  getItem(key) {
    if (key === "crm_token") {
      return TOKEN_EMPLEADO;
    }

    return almacenamiento.get(key) ?? null;
  },

  setItem(key, value) {
    almacenamiento.set(key, String(value));
  },

  removeItem(key) {
    almacenamiento.delete(key);
  },
};

  globalThis.fetch = async (url, options = {}) => {
    solicitudes.push({ url, options });

    return responder({
      success: true,
      data: {},
    });
  };
});

afterEach(() => {
  delete globalThis.fetch;
  delete globalThis.sessionStorage;
  delete globalThis.localStorage;
});

test("crea sesión sin enviar el token del empleado", async () => {
  globalThis.fetch = async (url, options) => {
    solicitudes.push({ url, options });

    return responder(
      {
        success: true,
        data: {
          visitor: { id: 1, nombre: "Invitado" },
          token: TOKEN_VISITANTE,
          expiresAt: "2026-10-30T12:00:00.000Z",
        },
      },
      201,
    );
  };

  const sesion = await crearSesionVisitante({
    nombre: "Invitado",
    correo: "invitado@example.com",
  });

  assert.equal(sesion.token, TOKEN_VISITANTE);
assert.equal(obtenerTokenVisitante(), TOKEN_VISITANTE);
assert.equal(
  globalThis.localStorage.getItem("crm_visitor_token"),
  TOKEN_VISITANTE,
);

  const { url, options } = solicitudes[0];

  assert.equal(
    url,
    "http://localhost:3000/api/chat/visitors/guest-session",
  );
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.headers["Content-Type"], "application/json");

  assert.deepEqual(JSON.parse(options.body), {
    nombre: "Invitado",
    correo: "invitado@example.com",
  });
});

test("rechaza un token de visitante malformado", async () => {
  globalThis.fetch = async () =>
    responder({
      success: true,
      data: { token: "token-invalido" },
    });

  await assert.rejects(
    crearSesionVisitante({ nombre: "Invitado" }),
    /Token de visitante inválido/,
  );

  assert.equal(obtenerTokenVisitante(), null);
});

test("no permite consultar sesión sin token de visitante", async () => {
  await assert.rejects(
    consultarSesionVisitante(),
    /No existe una sesión de visitante activa/,
  );

  assert.equal(solicitudes.length, 0);
});

test("consulta sesión usando únicamente el token de visitante", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  await consultarSesionVisitante();

  assert.equal(solicitudes.length, 1);
  assert.equal(
    solicitudes[0].options.headers.Authorization,
    `Bearer ${TOKEN_VISITANTE}`,
  );

  assert.notEqual(
    solicitudes[0].options.headers.Authorization,
    `Bearer ${TOKEN_EMPLEADO}`,
  );
});

test("abre una conversación mediante POST", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  await abrirConversacionVisitante();

  assert.equal(
    solicitudes[0].url,
    "http://localhost:3000/api/chat/visitors/conversations",
  );
  assert.equal(solicitudes[0].options.method, "POST");
});

test("lista y consulta conversaciones propias", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  await listarConversacionesVisitante();
  await obtenerConversacionVisitante(15);

  assert.equal(
    solicitudes[0].url,
    "http://localhost:3000/api/chat/visitors/conversations",
  );
  assert.equal(
    solicitudes[1].url,
    "http://localhost:3000/api/chat/visitors/conversations/15",
  );
});

test("envía contenido y clientMessageId sin modificarlos", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  const clientMessageId = "mensaje_12345678";

  await enviarMensajeVisitante(15, {
    contenido: "Hola, necesito información.",
    clientMessageId,
  });

  const { url, options } = solicitudes[0];

  assert.equal(
    url,
    "http://localhost:3000/api/chat/visitors/conversations/15/messages",
  );
  assert.equal(options.method, "POST");

  assert.deepEqual(JSON.parse(options.body), {
    contenido: "Hola, necesito información.",
    clientMessageId,
  });
});

test("un reintento conserva el mismo clientMessageId", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  const mensaje = {
    contenido: "Consulta de prueba",
    clientMessageId: "mensaje_reintento_123",
  };

  await enviarMensajeVisitante(15, mensaje);
  await enviarMensajeVisitante(15, mensaje);

  assert.equal(solicitudes.length, 2);

  const primero = JSON.parse(solicitudes[0].options.body);
  const segundo = JSON.parse(solicitudes[1].options.body);

  assert.equal(primero.clientMessageId, segundo.clientMessageId);
  assert.deepEqual(primero, segundo);
});

test("envía limit y cursor en la consulta de mensajes", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  await listarMensajesVisitante(15, {
    limit: 20,
    cursor: 100,
  });

  assert.equal(
    solicitudes[0].url,
    "http://localhost:3000/api/chat/visitors/conversations/15/messages?limit=20&cursor=100",
  );
});

test("propaga un error HTTP 401 con su estado", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  globalThis.fetch = async () =>
    responder(
      {
        success: false,
        message: "Sesión expirada.",
      },
      401,
    );

  await assert.rejects(
    consultarSesionVisitante(),
    (error) => {
      assert.equal(error.status, 401);
      assert.equal(error.message, "Sesión expirada.");
      return true;
    },
  );
});

test("propaga un error HTTP 409 sin ocultarlo", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  globalThis.fetch = async () =>
    responder(
      {
        success: false,
        message: "La conversación está resuelta.",
      },
      409,
    );

  await assert.rejects(
    enviarMensajeVisitante(15, {
      contenido: "Hola",
      clientMessageId: "mensaje_12345678",
    }),
    (error) => {
      assert.equal(error.status, 409);
      return true;
    },
  );
});

test("cierra sesión y elimina el token local", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  await cerrarSesionVisitante();

  assert.equal(solicitudes[0].options.method, "POST");
  assert.equal(
    solicitudes[0].url,
    "http://localhost:3000/api/chat/visitors/logout",
  );
  assert.equal(obtenerTokenVisitante(), null);
});

test("elimina el token incluso si falla el cierre remoto", async () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  globalThis.fetch = async () => {
    throw new Error("Error de conexión");
  };

  await assert.rejects(
    cerrarSesionVisitante(),
    /Error de conexión/,
  );

  assert.equal(obtenerTokenVisitante(), null);
});

test("permite eliminar explícitamente el token local", () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  eliminarTokenVisitante();

  assert.equal(obtenerTokenVisitante(), null);
});

test("recupera el token del visitante desde localStorage", () => {
  almacenamiento.set("crm_visitor_token", TOKEN_VISITANTE);

  assert.equal(obtenerTokenVisitante(), TOKEN_VISITANTE);
  assert.equal(
    globalThis.localStorage.getItem("crm_visitor_token"),
    TOKEN_VISITANTE,
  );
});