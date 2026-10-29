const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000/api";
const VISITOR_BASE_PATH = "/chat/visitors";
const VISITOR_TOKEN_KEY = "crm_visitor_token";

function obtenerTokenVisitante() {
  return sessionStorage.getItem(VISITOR_TOKEN_KEY);
}

function guardarTokenVisitante(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error("Token de visitante inválido.");
  }

  sessionStorage.setItem(VISITOR_TOKEN_KEY, token);
}

function eliminarTokenVisitante() {
  sessionStorage.removeItem(VISITOR_TOKEN_KEY);
}

async function visitorRequest(endpoint, options = {}, requiereSesion = true) {
  const headers = {
    ...options.headers,
  };

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (requiereSesion) {
    const token = obtenerTokenVisitante();

    if (!token) {
      throw new Error("No existe una sesión de visitante activa.");
    }

    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${VISITOR_BASE_PATH}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || "No fue posible completar la solicitud.",
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

async function crearSesionVisitante({ nombre, correo }) {
  const response = await visitorRequest(
    "/guest-session",
    {
      method: "POST",
      body: JSON.stringify({ nombre, correo }),
    },
    false,
  );

  guardarTokenVisitante(response.data.token);

  return response.data;
}

async function consultarSesionVisitante() {
  const response = await visitorRequest("/session");
  return response.data;
}

async function abrirConversacionVisitante() {
  return visitorRequest("/conversations", {
    method: "POST",
  });
}

async function listarConversacionesVisitante() {
  const response = await visitorRequest("/conversations");
  return response.data;
}

async function obtenerConversacionVisitante(conversationId) {
  const response = await visitorRequest(
    `/conversations/${conversationId}`,
  );

  return response.data;
}

async function enviarMensajeVisitante(
  conversationId,
  { contenido, clientMessageId },
) {
  return visitorRequest(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        contenido,
        clientMessageId,
      }),
    },
  );
}

async function listarMensajesVisitante(conversationId, query = {}) {
  const params = new URLSearchParams();

  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }

  if (query.cursor !== undefined && query.cursor !== null) {
    params.set("cursor", String(query.cursor));
  }

  const suffix = params.toString();

  const response = await visitorRequest(
    `/conversations/${conversationId}/messages${
      suffix ? `?${suffix}` : ""
    }`,
  );

  return response.data;
}

async function cerrarSesionVisitante() {
  try {
    return await visitorRequest("/logout", {
      method: "POST",
    });
  } finally {
    eliminarTokenVisitante();
  }
}

export {
  obtenerTokenVisitante,
  eliminarTokenVisitante,
  crearSesionVisitante,
  consultarSesionVisitante,
  abrirConversacionVisitante,
  listarConversacionesVisitante,
  obtenerConversacionVisitante,
  enviarMensajeVisitante,
  listarMensajesVisitante,
  cerrarSesionVisitante,
};
