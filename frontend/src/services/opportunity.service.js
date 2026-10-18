import { apiRequest } from "./api";

async function obtenerOportunidades() {
  const response = await apiRequest("/opportunities");
  return response.data;
}

async function crearOportunidad(datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest("/opportunities", {
    method: "POST",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function actualizarOportunidad(id, datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest(`/opportunities/${id}`, {
    method: "PUT",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function eliminarOportunidad(id) {
  const response = await apiRequest(`/opportunities/${id}`, {
    method: "DELETE",
  });

  return response;
}

export {
  obtenerOportunidades,
  crearOportunidad,
  actualizarOportunidad,
  eliminarOportunidad,
};