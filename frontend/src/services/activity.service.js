import { apiRequest } from "./api";

async function obtenerActividades() {
  const response = await apiRequest("/activities");
  return response.data;
}

async function crearActividad(datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest("/activities", {
    method: "POST",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function actualizarActividad(id, datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest(`/activities/${id}`, {
    method: "PUT",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function eliminarActividad(id) {
  const response = await apiRequest(`/activities/${id}`, {
    method: "DELETE",
  });

  return response;
}

export {
  obtenerActividades,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
};