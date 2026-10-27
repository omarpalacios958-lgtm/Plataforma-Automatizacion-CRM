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
}

module.exports = new ChatRepository();
