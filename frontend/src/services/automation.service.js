
import { apiRequest } from "./api";

const BASE_PATH = "/automations";

async function obtenerAutomatizaciones() {
  return apiRequest(BASE_PATH);
}

async function obtenerAutomatizacionPorId(id) {
  return apiRequest(`${BASE_PATH}/${id}`);
}

async function obtenerEjecuciones(id) {
  return apiRequest(`${BASE_PATH}/${id}/ejecuciones`);
}

async function crearAutomatizacion(datos) {
  return apiRequest(BASE_PATH, {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

async function actualizarAutomatizacion(id, datos) {
  return apiRequest(`${BASE_PATH}/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

async function desactivarAutomatizacion(id) {
  return apiRequest(`${BASE_PATH}/${id}/desactivar`, {
    method: "PATCH",
  });
}

export {
  obtenerAutomatizaciones,
  obtenerAutomatizacionPorId,
  obtenerEjecuciones,
  crearAutomatizacion,
  actualizarAutomatizacion,
  desactivarAutomatizacion,
};
