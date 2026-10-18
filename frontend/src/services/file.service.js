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

export {
  obtenerArchivos,
  obtenerArchivoPorId,
  subirArchivo,
  actualizarArchivo,
  eliminarArchivo,
};