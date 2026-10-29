
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

class VisitorMessageRepository {
  async buscarParticipanteActivo(visitorId, conversationId) {
    return prisma.chatParticipant.findFirst({
      where: {
        visitorId,
        conversationId,
        leftAt: null,
        visitor: { activo: true },
        conversation: { tipo: 'COMERCIAL' },
      },
      select: {
        id: true,
        conversationId: true,
        visitorId: true,
      },
    });
  }

  async enviarAtomico({
    visitorId,
    conversationId,
    contenido,
    clientMessageId,
  }) {
    return prisma.$transaction(async (tx) => {
      // Bloquea la conversacion durante el envio.
      // Un cambio de estado concurrente debe esperar.
      const locked = await tx.$queryRaw`
        SELECT id
        FROM "ChatConversation"
        WHERE id = ${conversationId}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        return { error: 'NOT_FOUND' };
      }

      const participant = await tx.chatParticipant.findFirst({
        where: {
          visitorId,
          conversationId,
          leftAt: null,
          visitor: { activo: true },
          conversation: { tipo: 'COMERCIAL' },
        },
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

      // Las conversaciones resueltas son de solo lectura.
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
    });
  }
}

module.exports = new VisitorMessageRepository();
