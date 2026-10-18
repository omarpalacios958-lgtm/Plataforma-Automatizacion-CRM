import { apiRequest } from "./api";

async function obtenerNotificaciones() {
  const response = await apiRequest("/notifications");
  return response.data;
}

async function obtenerNotificacionPorId(id) {
  const response = await apiRequest(`/notifications/${id}`);
  return response.data;
}

async function crearNotificacion(datos) {
  const response = await apiRequest("/notifications", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  return response;
}

async function actualizarNotificacion(id, datos) {
  const response = await apiRequest(`/notifications/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });

  return response;
}

async function eliminarNotificacion(id) {
  const response = await apiRequest(`/notifications/${id}`, {
    method: "DELETE",
  });

  return response;
}

export {
  obtenerNotificaciones,
  obtenerNotificacionPorId,
  crearNotificacion,
  actualizarNotificacion,
  eliminarNotificacion,
};