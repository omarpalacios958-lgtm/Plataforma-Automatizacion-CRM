import { apiRequest } from "./api";

async function obtenerArchivos() {
  const response = await apiRequest("/files");
  return response.data;
}

async function obtenerArchivoPorId(id) {
  const response = await apiRequest("/files/" + id);
  return response.data;
}

async function subirArchivo(datos) {
  const response = await apiRequest("/files/" + datos.entidad, {
    method: "POST",
    body: (() => {
      const formulario = new FormData();

      formulario.append("archivo", datos.archivo);
      formulario.append("nombre", datos.nombre);

      if (datos.companyId) {
        formulario.append("companyId", datos.companyId);
      }

      if (datos.contactId) {
        formulario.append("contactId", datos.contactId);
      }

      if (datos.leadId) {
        formulario.append("leadId", datos.leadId);
      }

      if (datos.opportunityId) {
        formulario.append("opportunityId", datos.opportunityId);
      }

      return formulario;
    })(),
  });

  return response;
}

async function actualizarArchivo(id, datos) {
  const formulario = new FormData();

  if (datos.nombre !== undefined) {
    formulario.append("nombre", datos.nombre);
  }

  if (datos.archivo) {
    formulario.append("archivo", datos.archivo);
  }

  const asociaciones = [
    "companyId",
    "contactId",
    "leadId",
    "opportunityId",
  ];

  asociaciones.forEach((campo) => {
    if (datos[campo] !== undefined) {
      formulario.append(campo, datos[campo] ?? "");
    }
  });

  const response = await apiRequest("/files/" + id, {
    method: "PUT",
    body: formulario,
  });

  return response;
}

async function eliminarArchivo(id) {
  const response = await apiRequest("/files/" + id, {
    method: "DELETE",
  });

  return response;
}

async function descargarArchivo(id) {
  const API_BASE_URL =
    import.meta.env?.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

  const token = localStorage.getItem("crm_token");

  if (!token) {
    throw new Error("Debes iniciar sesión para descargar archivos.");
  }

  const response = await fetch(
    `${API_BASE_URL}/files/${id}/download`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const datos = await response.json().catch(() => ({}));

    throw new Error(
      datos.message ||
        "No fue posible descargar el archivo.",
    );
  }

  return response.blob();
}

export {
  obtenerArchivos,
  obtenerArchivoPorId,
  subirArchivo,
  actualizarArchivo,
  eliminarArchivo,
  descargarArchivo,
};