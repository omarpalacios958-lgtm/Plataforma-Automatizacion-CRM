'use strict';
const visitorRepository = require('../repositories/visitor-message.repository');
const chatRepository = require('../repositories/chat.repository');
const { validarEnvio, validarPaginacion } = require('../validations/chat.validation');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validId(value) {
  return (typeof value === 'number' || typeof value === 'string') &&
    /^[1-9][0-9]*$/.test(String(value)) && Number.isSafeInteger(Number(value));
}

class VisitorMessageService {
  async verificarAcceso(visitorId, conversationId) {
    if (!validId(visitorId)) throw httpError(401, 'Identidad de visitante invalida.');
    if (!validId(conversationId)) throw httpError(400, 'ID de conversacion invalido.');
    const participant = await visitorRepository.buscarParticipanteActivo(
      Number(visitorId), Number(conversationId)
    );
    if (!participant) throw httpError(404, 'Conversacion no encontrada.');
    return participant;
  }

  resolverReintento(existing, contenido, conversationId) {
    if (existing.conversationId !== conversationId || existing.contenido !== contenido) {
      throw httpError(409, 'clientMessageId ya fue utilizado para otro mensaje.');
    }
    return { creado: false, mensaje: existing };
  }


  async enviar(visitorId, conversationId, body) {
    const participant = await this.verificarAcceso(
      visitorId,
      conversationId
    );

    const id = Number(conversationId);
    const { contenido, clientMessageId } = validarEnvio(body);

    for (let intento = 0; intento < 3; intento++) {
      try {
        const result = await visitorRepository.enviarAtomico({
          visitorId: Number(visitorId),
          conversationId: id,
          contenido,
          clientMessageId,
        });

        if (result.error === 'NOT_FOUND') {
          throw httpError(404, 'Conversacion no encontrada.');
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

        if (error.code === 'P2002') {
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


  async listar(visitorId, conversationId, query) {
    await this.verificarAcceso(visitorId, conversationId);
    const pagination = validarPaginacion(query || {});
    return chatRepository.listarMensajes({ conversationId: Number(conversationId), ...pagination });
  }
}

module.exports = new VisitorMessageService();
