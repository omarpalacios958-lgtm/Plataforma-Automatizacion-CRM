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

module.exports = { validarId, validarDestinatario };
