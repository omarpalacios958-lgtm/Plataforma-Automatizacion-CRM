
import { apiRequest } from "./api.js";

const COMMERCIAL_BASE_PATH = "/chat/commercial";

function construirQuery(query = {}, camposPermitidos = []) {
  const params = new URLSearchParams();

  for (const campo of camposPermitidos) {
    const valor = query[campo];

    if (valor !== undefined && valor !== null && valor !== "") {
      params.set(campo, String(valor));
    }
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

async function listarConversacionesComerciales(query = {}) {
  const suffix = construirQuery(query, [
    "limit",
    "cursor",
    "estado",
    "assignedAgentId",
  ]);

  const response = await apiRequest(
    `${COMMERCIAL_BASE_PATH}/conversations${suffix}`,
  );

  return response.data;
}

async function listarMisConversacionesComerciales(query = {}) {
  const suffix = construirQuery(query, [
    "limit",
    "cursor",
    "estado",
  ]);

  const response = await apiRequest(
    `${COMMERCIAL_BASE_PATH}/conversations/mine${suffix}`,
  );

  return response.data;
}

async function obtenerConversacionComercial(conversationId) {
  const response = await apiRequest(
    `${COMMERCIAL_BASE_PATH}/conversations/${conversationId}`,
  );

  return response.data;
}

async function asignarConversacionComercial(conversationId) {
  const response = await apiRequest(
    `${COMMERCIAL_BASE_PATH}/conversations/${conversationId}/assign`,
    {
      method: "POST",
    },
  );

  return response.data;
}

async function cambiarEstadoConversacionComercial(
  conversationId,
  estado,
) {
  const response = await apiRequest(
    `${COMMERCIAL_BASE_PATH}/conversations/${conversationId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    },
  );

  return response.data;
}

async function listarMensajesComerciales(
  conversationId,
  query = {},
) {
  const suffix = construirQuery(query, [
    "limit",
    "cursor",
  ]);

  const response = await apiRequest(
    `${COMMERCIAL_BASE_PATH}/conversations/${conversationId}/messages${suffix}`,
  );

  return response.data;
}

async function enviarMensajeComercial(
  conversationId,
  { contenido, clientMessageId },
) {
  return apiRequest(
    `${COMMERCIAL_BASE_PATH}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        contenido,
        clientMessageId,
      }),
    },
  );
}

export {
  listarConversacionesComerciales,
  listarMisConversacionesComerciales,
  obtenerConversacionComercial,
  asignarConversacionComercial,
  cambiarEstadoConversacionComercial,
  listarMensajesComerciales,
  enviarMensajeComercial,
};

