import { apiRequest } from "./api";

async function obtenerContactos() {
  const response = await apiRequest("/contacts");
  return response.data;
}

async function crearContacto(datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest("/contacts", {
    method: "POST",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function actualizarContacto(id, datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) =>
        valor !== undefined &&
        valor !== null &&
        (typeof valor !== "string" || valor.trim() !== ""),
    ),
  );

  const response = await apiRequest(`/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function eliminarContacto(id) {
  const response = await apiRequest(`/contacts/${id}`, {
    method: "DELETE",
  });

  return response;
}

export {
  obtenerContactos,
  crearContacto,
  actualizarContacto,
  eliminarContacto,
};