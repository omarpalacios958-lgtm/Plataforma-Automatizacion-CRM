
import { apiRequest } from "./api.js";

const INTERNAL_BASE_PATH = "/chat";

async function listarEmpleadosDisponibles() {
  const response = await apiRequest(
    `${INTERNAL_BASE_PATH}/employees`,
  );

  return response.data;
}

async function listarConversacionesInternas() {
  const response = await apiRequest(
    `${INTERNAL_BASE_PATH}/conversations`,
  );

  return response.data;
}

export {
  listarEmpleadosDisponibles,
  listarConversacionesInternas,
};
