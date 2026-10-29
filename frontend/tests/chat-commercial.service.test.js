
import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  listarConversacionesComerciales,
  listarMisConversacionesComerciales,
  obtenerConversacionComercial,
  asignarConversacionComercial,
  cambiarEstadoConversacionComercial,
  listarMensajesComerciales,
  enviarMensajeComercial,
} from "../src/services/chat-commercial.service.js";

const TOKEN_EMPLEADO = "jwt-empleado-prueba";
const TOKEN_VISITANTE = "v".repeat(43);

let solicitudes;
let respuestaSimulada;

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

  respuestaSimulada = responder({
    success: true,
    data: {},
  });

  globalThis.localStorage = {
    getItem(key) {
      return key === "crm_token" ? TOKEN_EMPLEADO : null;
    },
  };

  globalThis.sessionStorage = {
    getItem(key) {
      return key === "crm_visitor_token"
        ? TOKEN_VISITANTE
        : null;
    },
  };

  globalThis.fetch = async (url, options = {}) => {
    solicitudes.push({ url, options });
    return respuestaSimulada;
  };
});

afterEach(() => {
  delete globalThis.fetch;
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});

test("lista conversaciones con JWT del empleado", async () => {
  await listarConversacionesComerciales();

  assert.equal(solicitudes.length, 1);
  assert.equal(
    solicitudes[0].url,
    "http://localhost:3000/api/chat/commercial/conversations",
  );
  assert.equal(
    solicitudes[0].options.headers.Authorization,
    `Bearer ${TOKEN_EMPLEADO}`,
  );
});

test("no utiliza el token de visitante", async () => {
  await listarConversacionesComerciales();

  assert.notEqual(
    solicitudes[0].options.headers.Authorization,
    `Bearer ${TOKEN_VISITANTE}`,
  );
});

test("envía filtros y paginación de conversaciones", async () => {
  await listarConversacionesComerciales({
    limit: 20,
    cursor: 100,
    estado: "PENDIENTE",
    assignedAgentId: 5,
  });

  const url = new URL(solicitudes[0].url);

  assert.equal(url.searchParams.get("limit"), "20");
  assert.equal(url.searchParams.get("cursor"), "100");
  assert.equal(url.searchParams.get("estado"), "PENDIENTE");
  assert.equal(url.searchParams.get("assignedAgentId"), "5");
});

test("omite parámetros no admitidos en la bandeja", async () => {
  await listarConversacionesComerciales({
    limit: 10,
    parametroDesconocido: "valor",
  });

  const url = new URL(solicitudes[0].url);

  assert.equal(url.searchParams.get("limit"), "10");
  assert.equal(
    url.searchParams.has("parametroDesconocido"),
    false,
  );
});

test("lista conversaciones propias con la ruta fija mine", async () => {
  await listarMisConversacionesComerciales({
    estado: "EN_CURSO",
  });

  const url = new URL(solicitudes[0].url);

  assert.equal(
    url.pathname,
    "/api/chat/commercial/conversations/mine",
  );
  assert.equal(url.searchParams.get("estado"), "EN_CURSO");
});

test("no envía assignedAgentId al listar conversaciones propias", async () => {
  await listarMisConversacionesComerciales({
    assignedAgentId: 99,
    limit: 15,
  });

  const url = new URL(solicitudes[0].url);

  assert.equal(url.searchParams.has("assignedAgentId"), false);
  assert.equal(url.searchParams.get("limit"), "15");
});

test("consulta una conversación comercial por ID", async () => {
  await obtenerConversacionComercial(25);

  assert.equal(
    solicitudes[0].url,
    "http://localhost:3000/api/chat/commercial/conversations/25",
  );
});

test("asigna una conversación mediante POST", async () => {
  await asignarConversacionComercial(25);

  assert.equal(
    solicitudes[0].url,
    "http://localhost:3000/api/chat/commercial/conversations/25/assign",
  );
  assert.equal(solicitudes[0].options.method, "POST");
});

test("cambia el estado mediante PATCH", async () => {
  await cambiarEstadoConversacionComercial(25, "EN_CURSO");

  const { url, options } = solicitudes[0];

  assert.equal(
    url,
    "http://localhost:3000/api/chat/commercial/conversations/25/status",
  );
  assert.equal(options.method, "PATCH");
  assert.deepEqual(JSON.parse(options.body), {
    estado: "EN_CURSO",
  });
});

test("permite solicitar la transición a RESUELTA", async () => {
  await cambiarEstadoConversacionComercial(25, "RESUELTA");

  assert.deepEqual(
    JSON.parse(solicitudes[0].options.body),
    { estado: "RESUELTA" },
  );
});

test("lista mensajes con limit y cursor", async () => {
  await listarMensajesComerciales(25, {
    limit: 30,
    cursor: 200,
  });

  const url = new URL(solicitudes[0].url);

  assert.equal(
    url.pathname,
    "/api/chat/commercial/conversations/25/messages",
  );
  assert.equal(url.searchParams.get("limit"), "30");
  assert.equal(url.searchParams.get("cursor"), "200");
});

test("no envía filtros comerciales al listar mensajes", async () => {
  await listarMensajesComerciales(25, {
    limit: 20,
    estado: "EN_CURSO",
    assignedAgentId: 5,
  });

  const url = new URL(solicitudes[0].url);

  assert.equal(url.searchParams.get("limit"), "20");
  assert.equal(url.searchParams.has("estado"), false);
  assert.equal(url.searchParams.has("assignedAgentId"), false);
});

test("envía contenido y clientMessageId correctamente", async () => {
  await enviarMensajeComercial(25, {
    contenido: "Hola, ¿en qué puedo ayudarte?",
    clientMessageId: "mensaje_comercial_123",
  });

  const { url, options } = solicitudes[0];

  assert.equal(
    url,
    "http://localhost:3000/api/chat/commercial/conversations/25/messages",
  );
  assert.equal(options.method, "POST");
  assert.deepEqual(JSON.parse(options.body), {
    contenido: "Hola, ¿en qué puedo ayudarte?",
    clientMessageId: "mensaje_comercial_123",
  });
});

test("conserva creado=true al enviar un mensaje nuevo", async () => {
  respuestaSimulada = responder(
    {
      success: true,
      data: { id: 100, contenido: "Hola" },
      creado: true,
    },
    201,
  );

  const resultado = await enviarMensajeComercial(25, {
    contenido: "Hola",
    clientMessageId: "mensaje_comercial_123",
  });

  assert.equal(resultado.creado, true);
  assert.equal(resultado.data.id, 100);
});

test("conserva creado=false en un reintento", async () => {
  respuestaSimulada = responder({
    success: true,
    data: { id: 100, contenido: "Hola" },
    creado: false,
  });

  const resultado = await enviarMensajeComercial(25, {
    contenido: "Hola",
    clientMessageId: "mensaje_comercial_123",
  });

  assert.equal(resultado.creado, false);
  assert.equal(resultado.data.id, 100);
});

for (const status of [401, 403, 404, 409]) {
  test(`conserva el estado HTTP ${status} en los errores`, async () => {
    respuestaSimulada = responder(
      {
        success: false,
        message: `Error HTTP ${status}`,
      },
      status,
    );

    await assert.rejects(
      listarConversacionesComerciales(),
      (error) => {
        assert.equal(error.status, status);
        assert.equal(error.message, `Error HTTP ${status}`);
        return true;
      },
    );
  });
}
