'use strict';

function error400(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function validarInvitado(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    error400('Datos del visitante invalidos.');
  }
  if (typeof body.nombre !== 'string') error400('Nombre invalido.');
  const nombre = body.nombre.trim();
  if (nombre.length < 2 || nombre.length > 120 || /[\x00-\x1F\x7F]/.test(nombre)) {
    error400('El nombre debe tener entre 2 y 120 caracteres.');
  }
  let correo = null;
  if (body.correo !== undefined && body.correo !== null && body.correo !== '') {
    if (typeof body.correo !== 'string') error400('Correo invalido.');
    correo = body.correo.trim().toLowerCase();
    if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      error400('Correo invalido.');
    }
  }
  return { nombre, correo };
}

module.exports = { validarInvitado };
