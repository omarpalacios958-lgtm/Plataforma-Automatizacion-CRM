'use strict';
const prisma = require('../../../config/database');

class VisitorMessageRepository {
  async buscarParticipanteActivo(visitorId, conversationId) {
    return prisma.chatParticipant.findFirst({
      where: {
        visitorId, conversationId, leftAt: null,
        visitor: { activo: true },
        conversation: { tipo: 'COMERCIAL' },
      },
      select: { id: true, conversationId: true, visitorId: true },
    });
  }
}

module.exports = new VisitorMessageRepository();
