import { apiRequest } from "./api";

async function obtenerUsuarios() {
  const response = await apiRequest("/users");
  return response.data;
}

async function crearUsuario(datos) {
  const response = await apiRequest("/users", {
    method: "POST",
    body: JSON.stringify(datos),
  });

  return response;
}

async function actualizarUsuario(id, datos) {
  const response = await apiRequest(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });

  return response;
}

async function eliminarUsuario(id) {
  const response = await apiRequest(`/users/${id}`, {
    method: "DELETE",
  });

  return response;
}

export {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};