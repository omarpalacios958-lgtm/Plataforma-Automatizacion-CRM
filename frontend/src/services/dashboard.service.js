import { apiRequest } from "./api";

async function obtenerEstadisticas() {
  const response = await apiRequest("/dashboard");

  return response.data;
}

export { obtenerEstadisticas };