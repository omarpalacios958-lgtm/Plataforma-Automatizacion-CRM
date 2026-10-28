
'use strict';

const repository = require('../repositories/commercial.repository');

const ALLOWED_ROLES = new Set([
  'Administrador',
  'Vendedor',
]);

const STATUSES = new Set([
  'PENDIENTE',
  'ASIGNADA',
  'EN_CURSO',
  'RESUELTA',
]);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validId(value) {
  return (
    (typeof value === 'number' || typeof value === 'string') &&
    /^\d+$/.test(String(value)) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}

function parseOptionalId(value, name) {
  if (value === undefined) return undefined;

  if (!validId(value)) {
    throw httpError(400, `${name} invalido.`);
  }

  return Number(value);
}

function parsePagination(query = {}) {
  const limit = query.limit === undefined
    ? 20
    : Number(query.limit);

  if (
    !/^\d+$/.test(String(query.limit ?? '20')) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw httpError(
      400,
      'limit debe ser un entero entre 1 y 100.'
    );
  }

  const cursor = query.cursor === undefined
    ? null
    : parseOptionalId(query.cursor, 'cursor');

  const estado = query.estado;

  if (
    estado !== undefined &&
    (typeof estado !== 'string' || !STATUSES.has(estado))
  ) {
    throw httpError(
      400,
      'Estado de conversacion invalido.'
    );
  }

  return { limit, cursor, estado };
}

class CommercialService {
  async autorizar(user) {
    if (!validId(user?.id)) {
      throw httpError(
        401,
        'Identidad de usuario no valida.'
      );
    }

    const employee = await repository.buscarEmpleado(
      Number(user.id)
    );

    if (
      !employee ||
      !employee.activo ||
      !ALLOWED_ROLES.has(employee.role?.nombre)
    ) {
      throw httpError(
        403,
        'No tiene permisos para acceder a conversaciones comerciales.'
      );
    }

    return employee;
  }

  async listar(user, query = {}) {
    await this.autorizar(user);

    const pagination = parsePagination(query);

    const assignedAgentId = parseOptionalId(
      query.assignedAgentId,
      'assignedAgentId'
    );

    return repository.listar({
      ...pagination,
      assignedAgentId,
    });
  }

  async listarPropias(user, query = {}) {
    const employee = await this.autorizar(user);

    const pagination = parsePagination(query);

    return repository.listarPropias({
      agentId: employee.id,
      ...pagination,
    });
  }

  async obtener(user, conversationId) {
    await this.autorizar(user);

    if (!validId(conversationId)) {
      throw httpError(
        400,
        'ID de conversacion invalido.'
      );
    }

    const conversation = await repository.obtener(
      Number(conversationId)
    );

    if (!conversation) {
      throw httpError(
        404,
        'Conversacion comercial no encontrada.'
      );
    }

    return conversation;
  }

  async asignar(user, conversationId) {
    const employee = await this.autorizar(user);

    if (!validId(conversationId)) {
      throw httpError(
        400,
        'ID de conversacion invalido.'
      );
    }

    const result = await repository.asignar(
      Number(conversationId),
      employee.id
    );

    if (result.error === 'NOT_FOUND') {
      throw httpError(
        404,
        'Conversacion comercial no encontrada.'
      );
    }

    if (result.error === 'CONFLICT') {
      throw httpError(
        409,
        'La conversacion ya no esta pendiente o ya fue asignada.'
      );
    }

    return result.conversation;
  }
}

module.exports = new CommercialService();
