
'use strict';

const commercialService = require('./commercial.service');
const commercialMessageRepository = require(
  '../repositories/commercial-message.repository'
);
const chatRepository = require('../repositories/chat.repository');

const {
  validarEnvio,
  validarPaginacion,
} = require('../validations/chat.validation');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validId(value) {
  return (
    (typeof value === 'number' || typeof value === 'string') &&
    /^[1-9][0-9]*$/.test(String(value)) &&
    Number.isSafeInteger(Number(value))
  );
}

class CommercialMessageService {
  async verificarAcceso(user, conversationId) {
    const employee = await commercialService.autorizar(user);

    if (!validId(conversationId)) {
      throw httpError(400, 'ID de conversacion invalido.');
    }

    const participant =
      await commercialMessageRepository.buscarParticipanteActivo(
        employee.id,
        Number(conversationId)
      );

    if (!participant) {
      throw httpError(404, 'Conversacion comercial no encontrada.');
    }

    return { employee, participant };
  }

  resolverReintento(existing, contenido, conversationId) {
    if (
      existing.conversationId !== conversationId ||
      existing.contenido !== contenido
    ) {
      throw httpError(
        409,
        'clientMessageId ya fue utilizado para otro mensaje.'
      );
    }

    return {
      creado: false,
      mensaje: existing,
    };
  }

  async enviar(user, conversationId, body) {
    const employee = await commercialService.autorizar(user);

    if (!validId(conversationId)) {
      throw httpError(400, 'ID de conversacion invalido.');
    }

    const id = Number(conversationId);
    const { contenido, clientMessageId } = validarEnvio(body);

    // Los reintentos transitorios se limitan a conflictos
    // de serialización de PostgreSQL.
    for (let intento = 0; intento < 3; intento++) {
      try {
        const result = await commercialMessageRepository.enviarAtomico({
          agentId: employee.id,
          conversationId: id,
          contenido,
          clientMessageId,
        });

        if (result.error === 'NOT_FOUND') {
          throw httpError(
            404,
            'Conversacion comercial no encontrada.'
          );
        }

        if (result.error === 'RESOLVED') {
          throw httpError(
            409,
            'La conversacion esta resuelta y no admite mensajes.'
          );
        }

        if (!result.creado) {
          return this.resolverReintento(
            result.mensaje,
            contenido,
            id
          );
        }

        return result;
      } catch (error) {
        if (error.code === 'P2034' && intento < 2) {
          continue;
        }

        // Dos solicitudes pueden competir por la misma clave.
        // Una vez confirmada la otra inserción, recuperamos
        // el mensaje sin duplicarlo.
        if (error.code === 'P2002') {
          const participant =
            await commercialMessageRepository.buscarParticipanteActivo(
              employee.id,
              id
            );

          if (!participant) {
            throw httpError(
              404,
              'Conversacion comercial no encontrada.'
            );
          }

          const existing = await chatRepository.buscarMensajePorClave(
            participant.id,
            clientMessageId
          );

          if (existing) {
            return this.resolverReintento(
              existing,
              contenido,
              id
            );
          }
        }

        throw error;
      }
    }
  }

  async listar(user, conversationId, query = {}) {
    await this.verificarAcceso(user, conversationId);

    const pagination = validarPaginacion(query);

    return chatRepository.listarMensajes({
      conversationId: Number(conversationId),
      ...pagination,
    });
  }
}

module.exports = new CommercialMessageService();
