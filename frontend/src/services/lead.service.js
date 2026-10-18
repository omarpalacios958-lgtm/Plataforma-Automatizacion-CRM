import { apiRequest } from "./api";

async function obtenerLeads() {
  const response = await apiRequest("/leads");
  return response.data;
}

async function crearLead(datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest("/leads", {
    method: "POST",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function actualizarLead(id, datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest(`/leads/${id}`, {
    method: "PUT",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function eliminarLead(id) {
  const response = await apiRequest(`/leads/${id}`, {
    method: "DELETE",
  });

  return response;
}

export {
  obtenerLeads,
  crearLead,
  actualizarLead,
  eliminarLead,
};