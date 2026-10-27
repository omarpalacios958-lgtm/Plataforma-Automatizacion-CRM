const prisma = require('../../../config/database');

const selectUser = { id: true, nombre: true, apellido: true, activo: true };
const conversationInclude = {
  participants: {
    select: {
      id: true,
      userId: true,
      rol: true,
      user: { select: selectUser },
    },
  },
};

class ChatRepository {
  async buscarEmpleadoActivo(id) {
    return prisma.user.findFirst({ where: { id, activo: true }, select: selectUser });
  }

  async buscarPrivada(privatePairKey) {
    return prisma.chatConversation.findUnique({
      where: { privatePairKey },
      include: conversationInclude,
    });
  }

  async crearPrivada({ privatePairKey, emisorId, destinatarioId }) {
    return prisma.$transaction(async (tx) => {
      return tx.chatConversation.create({
        data: {
          tipo: 'INTERNO_PRIVADO',
          estado: 'EN_CURSO',
          privatePairKey,
          createdByUserId: emisorId,
          participants: {
            create: [
              { userId: emisorId, rol: 'MIEMBRO' },
              { userId: destinatarioId, rol: 'MIEMBRO' },
            ],
          },
        },
        include: conversationInclude,
      });
    });
  }

  async buscarParticipanteActivo(conversationId, userId) {
    return prisma.chatParticipant.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null,
        user: { activo: true },
        conversation: { tipo: 'INTERNO_PRIVADO' },
      },
      select: { id: true, conversationId: true, userId: true },
    });
  }

  async buscarMensajePorClave(participantId, clientMessageId) {
    return prisma.chatMessage.findUnique({
      where: { participantId_clientMessageId: { participantId, clientMessageId } },
      select: { id: true, conversationId: true, participantId: true, contenido: true,
        clientMessageId: true, createdAt: true, editedAt: true, deletedAt: true },
    });
  }

  async crearMensaje({ conversationId, participantId, contenido, clientMessageId }) {
    return prisma.chatMessage.create({
      data: { conversationId, participantId, contenido, clientMessageId },
      select: { id: true, conversationId: true, participantId: true, contenido: true,
        clientMessageId: true, createdAt: true, editedAt: true, deletedAt: true },
    });
  }

  async listarMensajes({ conversationId, cursor, limit }) {
    const mensajes = await prisma.chatMessage.findMany({
      where: { conversationId, ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: { id: true, conversationId: true, participantId: true, contenido: true,
        clientMessageId: true, createdAt: true, editedAt: true, deletedAt: true },
    });
    const hayMas = mensajes.length > limit;
    const pagina = mensajes.slice(0, limit);
    return {
      messages: pagina,
      nextCursor: hayMas ? pagina[pagina.length - 1].id : null,
    };
  }

}

module.exports = new ChatRepository();
