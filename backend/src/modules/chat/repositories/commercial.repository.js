
'use strict';

const prisma = require('../../../config/database');

const conversationSelect = {
  id: true,
  tipo: true,
  estado: true,
  nombre: true,
  assignedAgentId: true,
  createdAt: true,
  updatedAt: true,
};

class CommercialRepository {
  async buscarEmpleado(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        activo: true,
        role: { select: { nombre: true } },
      },
    });
  }

  async listar({ limit, cursor, estado, assignedAgentId }) {
    const where = { tipo: 'COMERCIAL' };

    if (estado) where.estado = estado;

    if (assignedAgentId !== undefined) {
      where.assignedAgentId = assignedAgentId;
    }

    if (cursor !== null) {
      where.id = { lt: cursor };
    }

    const rows = await prisma.chatConversation.findMany({
      where,
      select: conversationSelect,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const conversations = rows.slice(0, limit);

    return {
      conversations,
      nextCursor: hasMore
        ? conversations[conversations.length - 1].id
        : null,
    };
  }

  async listarPropias({ agentId, limit, cursor, estado }) {
    const where = {
      tipo: 'COMERCIAL',
      assignedAgentId: agentId,
    };

    if (estado) where.estado = estado;

    if (cursor !== null) {
      where.id = { lt: cursor };
    }

    const rows = await prisma.chatConversation.findMany({
      where,
      select: conversationSelect,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const conversations = rows.slice(0, limit);

    return {
      conversations,
      nextCursor: hasMore
        ? conversations[conversations.length - 1].id
        : null,
    };
  }

  async obtener(conversationId) {
    return prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        tipo: 'COMERCIAL',
      },
      select: {
        ...conversationSelect,
        participants: {
          where: {
            leftAt: null,
            visitorId: { not: null },
          },
          select: {
            id: true,
            visitor: {
              select: {
                id: true,
                nombre: true,
                correo: true,
              },
            },
          },
        },
      },
    });
  }

  async asignar(conversationId, agentId) {
    return prisma.$transaction(async (tx) => {
      const changed = await tx.chatConversation.updateMany({
        where: {
          id: conversationId,
          tipo: 'COMERCIAL',
          estado: 'PENDIENTE',
          assignedAgentId: null,
        },
        data: {
          estado: 'ASIGNADA',
          assignedAgentId: agentId,
        },
      });

      if (changed.count !== 1) {
        const current = await tx.chatConversation.findFirst({
          where: {
            id: conversationId,
            tipo: 'COMERCIAL',
          },
          select: { id: true },
        });

        return {
          error: current ? 'CONFLICT' : 'NOT_FOUND',
        };
      }

      const participant = await tx.chatParticipant.findFirst({
        where: {
          conversationId,
          userId: agentId,
        },
        select: { id: true },
      });

      if (participant) {
        await tx.chatParticipant.update({
          where: { id: participant.id },
          data: {
            rol: 'AGENTE',
            leftAt: null,
          },
        });
      } else {
        await tx.chatParticipant.create({
          data: {
            conversationId,
            userId: agentId,
            rol: 'AGENTE',
          },
        });
      }

      await tx.chatAssignmentHistory.create({
        data: {
          conversationId,
          fromAgentId: null,
          toAgentId: agentId,
          changedByUserId: agentId,
        },
      });

      const conversation = await tx.chatConversation.findUnique({
        where: { id: conversationId },
        select: conversationSelect,
      });

      return { conversation };
    });
  }
}

module.exports = new CommercialRepository();
