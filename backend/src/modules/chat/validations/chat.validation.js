function validarId(valor) {
  return Number.isSafeInteger(valor) && valor > 0;
}

function validarDestinatario(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos) || !validarId(datos.recipientUserId)) {
    const error = new Error('El ID del destinatario no es valido.');
    error.status = 400;
    throw error;
  }
  return datos.recipientUserId;
}

function validarEnvio(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos) ||
      typeof datos.contenido !== 'string' || !datos.contenido.trim() ||
      datos.contenido.length > 10000) {
    const error = new Error('El contenido debe tener entre 1 y 10000 caracteres.');
    error.status = 400;
    throw error;
  }
  if (typeof datos.clientMessageId !== 'string' ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(datos.clientMessageId)) {
    const error = new Error('clientMessageId debe tener entre 8 y 128 caracteres alfanumericos, guion o guion bajo.');
    error.status = 400;
    throw error;
  }
  return { contenido: datos.contenido.trim(), clientMessageId: datos.clientMessageId };
}

function validarPaginacion(query) {
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  const cursor = query.cursor === undefined ? null : Number(query.cursor);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50 ||
      (cursor !== null && !validarId(cursor)) ||
      (query.limit !== undefined && !/^[0-9]+$/.test(String(query.limit))) ||
      (query.cursor !== undefined && !/^[0-9]+$/.test(String(query.cursor)))) {
    const error = new Error('Paginacion invalida: limit debe ser 1-50 y cursor un ID positivo.');
    error.status = 400;
    throw error;
  }
  return { limit, cursor };
}

function validarGrupo(datos, creadorId) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos) ||
      typeof datos.nombre !== 'string' || !datos.nombre.trim() ||
      datos.nombre.trim().length > 120 ||
      !Array.isArray(datos.participantUserIds) ||
      datos.participantUserIds.length < 1 || datos.participantUserIds.length > 49 ||
      !datos.participantUserIds.every(validarId) ||
      new Set(datos.participantUserIds).size !== datos.participantUserIds.length ||
      datos.participantUserIds.includes(creadorId)) {
    const error = new Error('Indica un nombre de 1 a 120 caracteres y entre 1 y 49 empleados distintos del creador, sin duplicados.');
    error.status = 400;
    throw error;
  }
  return { nombre: datos.nombre.trim(), participantUserIds: datos.participantUserIds };
}

function validarEmpleadoObjetivo(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos) || !validarId(datos.userId)) {
    const error = new Error('userId debe ser un ID positivo.'); error.status = 400; throw error;
  }
  return datos.userId;
}

module.exports = { validarId, validarDestinatario, validarEnvio, validarPaginacion, validarGrupo, validarEmpleadoObjetivo };
