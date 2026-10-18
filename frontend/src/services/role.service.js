import { apiRequest } from "./api";

async function obtenerRoles() {
  const response = await apiRequest("/roles");
  return response.data;
}

export { obtenerRoles };