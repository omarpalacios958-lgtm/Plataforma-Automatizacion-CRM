import { apiRequest } from "./api";

async function login(correo, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      correo,
      password,
    }),
  });
}

export { login };