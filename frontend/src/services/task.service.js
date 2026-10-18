import { apiRequest } from "./api";

async function obtenerTareas() {
  const response = await apiRequest("/tasks");
  return response.data;
}

async function crearTarea(datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest("/tasks", {
    method: "POST",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function actualizarTarea(id, datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        (valor !== null || datos.fechaLimite === null) &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function eliminarTarea(id) {
  const response = await apiRequest(`/tasks/${id}`, {
    method: "DELETE",
  });

  return response;
}

export {
  obtenerTareas,
  crearTarea,
  actualizarTarea,
  eliminarTarea,
};