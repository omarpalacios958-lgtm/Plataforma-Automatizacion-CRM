
'use strict';

const prisma = require('../../../config/database');

const messageSelect = {
  id: true,
  conversationId: true,
  participantId: true,
  contenido: true,
  clientMessageId: true,
  createdAt: true,
  editedAt: true,
  deletedAt: true,
};

function filtroAgente(conversationId, agentId) {
  return {
    conversationId,
    userId: agentId,
    rol: 'AGENTE',
    leftAt: null,
    user: { activo: true },
    conversation: {
      tipo: 'COMERCIAL',
      assignedAgentId: agentId,
    },
  };
}

class CommercialMessageRepository {
  async buscarParticipanteActivo(agentId, conversationId) {
    return prisma.chatParticipant.findFirst({
      where: filtroAgente(conversationId, agentId),
      select: {
        id: true,
        conversationId: true,
        userId: true,
        conversation: {
          select: { estado: true },
        },
      },
    });
  }

  async enviarAtomico({
    agentId,
    conversationId,
    contenido,
    clientMessageId,
  }) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.chatParticipant.findFirst({
        where: filtroAgente(conversationId, agentId),
        select: {
          id: true,
          conversation: {
            select: { estado: true },
          },
        },
      });

      if (!participant) {
        return { error: 'NOT_FOUND' };
      }

      // La conversación resuelta conserva su historial,
      // pero no admite mensajes nuevos.
      if (participant.conversation.estado === 'RESUELTA') {
        return { error: 'RESOLVED' };
      }

      const existing = await tx.chatMessage.findUnique({
        where: {
          participantId_clientMessageId: {
            participantId: participant.id,
            clientMessageId,
          },
        },
        select: messageSelect,
      });

      if (existing) {
        return {
          creado: false,
          mensaje: existing,
        };
      }

      const mensaje = await tx.chatMessage.create({
        data: {
          conversationId,
          participantId: participant.id,
          contenido,
          clientMessageId,
        },
        select: messageSelect,
      });

      return {
        creado: true,
        mensaje,
      };
    }, {
      isolationLevel: 'Serializable',
    });
  }
}

module.exports = new CommercialMessageRepository();
