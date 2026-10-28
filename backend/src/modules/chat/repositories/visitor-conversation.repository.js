'use strict';
const prisma = require('../../../config/database');
const select = { id: true, tipo: true, estado: true, nombre: true, assignedAgentId: true, createdAt: true, updatedAt: true };
const whereOwn = visitorId => ({ tipo: 'COMERCIAL', participants: { some: { visitorId, leftAt: null } } });
class VisitorConversationRepository {
  async abrirUnaSola(visitorId) {
    return prisma.$transaction(async tx => {
      // Bloqueo transaccional por visitante. Serializa las solicitudes simultaneas,
      // incluso cuando llegan a distintas instancias del backend.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73821, ${visitorId}::integer)`;
      const existing = await tx.chatConversation.findFirst({
        where: whereOwn(visitorId), orderBy: { id: 'asc' }, select,
      });
      if (existing) return { creada: false, conversacion: existing };
      const conversation = await tx.chatConversation.create({
        data: {
          tipo: 'COMERCIAL', estado: 'PENDIENTE',
          participants: { create: { visitorId, rol: 'VISITANTE' } },
        }, select,
      });
      return { creada: true, conversacion: conversation };
    });
  }
  async listarPropias(visitorId) {
    return prisma.chatConversation.findMany({ where: whereOwn(visitorId), orderBy: { id: 'asc' }, take: 1, select });
  }
  async buscarPropia(visitorId, conversationId) {
    return prisma.chatConversation.findFirst({ where: { ...whereOwn(visitorId), id: conversationId }, select });
  }
}
module.exports = new VisitorConversationRepository();
