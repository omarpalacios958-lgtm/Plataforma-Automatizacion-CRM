
import { apiRequest } from "./api.js";

const INTERNAL_BASE_PATH = "/chat";

function esEnteroSeguro(valor, minimo = 1) {
  return Number.isSafeInteger(valor) && valor >= minimo;
}

function validarOpcionesMensajes(conversationId, opciones) {
  if (!esEnteroSeguro(conversationId)) {
    throw new Error("El ID de conversación debe ser un entero positivo.");
  }

  if (
    !opciones ||
    typeof opciones !== "object" ||
    Array.isArray(opciones)
  ) {
    throw new Error("Las opciones de paginación no son válidas.");
  }

  const { limit, cursor, afterId } = opciones;

  if (
    limit !== undefined &&
    (!esEnteroSeguro(limit) || limit > 50)
  ) {
    throw new Error("limit debe estar entre 1 y 50.");
  }

  if (
    cursor !== undefined &&
    !esEnteroSeguro(cursor)
  ) {
    throw new Error("cursor debe ser un entero positivo.");
  }

  if (
    afterId !== undefined &&
    !esEnteroSeguro(afterId, 0)
  ) {
    throw new Error("afterId debe ser un entero no negativo.");
  }

  if (cursor !== undefined && afterId !== undefined) {
    throw new Error("cursor y afterId no pueden combinarse.");
  }

  const parametros = new URLSearchParams();

  if (limit !== undefined) {
    parametros.set("limit", String(limit));
  }

  if (cursor !== undefined) {
    parametros.set("cursor", String(cursor));
  }

  if (afterId !== undefined) {
    parametros.set("afterId", String(afterId));
  }

  return parametros.toString();
}

async function listarEmpleadosDisponibles() {
  const response = await apiRequest(
    `${INTERNAL_BASE_PATH}/employees`,
  );

  return response.data;
}

async function listarConversacionesInternas() {
  const response = await apiRequest(
    `${INTERNAL_BASE_PATH}/conversations`,
  );

  return response.data;
}

async function obtenerMensajesInternos(
  conversationId,
  opciones = {},
) {
  const parametros = validarOpcionesMensajes(
    conversationId,
    opciones,
  );

  const ruta =
    `${INTERNAL_BASE_PATH}/conversations/${conversationId}/messages`;

  const url = parametros ? `${ruta}?${parametros}` : ruta;

  const response = await apiRequest(url);

  return response.data;
}

export {
  listarEmpleadosDisponibles,
  listarConversacionesInternas,
  obtenerMensajesInternos,
};
