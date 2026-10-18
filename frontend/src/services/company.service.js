import { apiRequest } from "./api";

async function obtenerEmpresas() {
  const response = await apiRequest("/companies");
  return response.data;
}

async function crearEmpresa(datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) => valor !== undefined && valor !== null && valor.trim() !== "",
    ),
  );

  const response = await apiRequest("/companies", {
    method: "POST",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function actualizarEmpresa(id, datos) {
  const datosLimpios = Object.fromEntries(
    Object.entries(datos).filter(
      ([, valor]) => valor !== undefined && valor !== null && valor.trim() !== "",
    ),
  );

  const response = await apiRequest(`/companies/${id}`, {
    method: "PUT",
    body: JSON.stringify(datosLimpios),
  });

  return response;
}

async function eliminarEmpresa(id) {
  const response = await apiRequest(`/companies/${id}`, {
    method: "DELETE",
  });

  return response;
}

export {
  obtenerEmpresas,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
};