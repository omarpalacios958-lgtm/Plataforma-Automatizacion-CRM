'use strict';
const { randomBytes, createHash } = require('node:crypto');
const repository = require('../repositories/visitor.repository');
const { validarInvitado } = require('../validations/visitor.validation');

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function unauthorized() {
  const error = new Error('Sesion de visitante invalida o expirada.');
  error.status = 401;
  return error;
}

function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

class VisitorService {
  async crearSesion(body) {
    const { nombre, correo } = validarInvitado(body);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const visitor = await repository.crearInvitadoConSesion({
      nombre, correo, tokenHash: hashToken(token), expiresAt,
    });
    return { visitor, token, expiresAt };
  }

  async verificarToken(token) {
    // Un token de 32 bytes codificado en base64url ocupa 43 caracteres.
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw unauthorized();
    }
    const session = await repository.buscarSesionVigente(hashToken(token), new Date());
    if (!session) throw unauthorized();
    return session;
  }

  async cerrarSesion(sessionId) {
    const result = await repository.revocarSesion(sessionId, new Date());
    if (result.count !== 1) throw unauthorized();
  }
}

module.exports = new VisitorService();
