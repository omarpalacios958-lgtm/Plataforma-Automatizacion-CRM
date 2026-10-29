
const API_BASE_URL = "http://localhost:3000/api";

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("crm_token");
  const esFormData = options.body instanceof FormData;

  const headers = {
    ...options.headers,
  };

  if (!esFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || "Ocurrió un error al comunicarse con el servidor.",
    );

    error.status = response.status;

    throw error;
  }

  return data;
}

export { apiRequest };
