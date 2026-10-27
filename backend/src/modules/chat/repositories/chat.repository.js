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

  async buscarEmpleadosActivos(ids) {
    return prisma.user.findMany({ where: { id: { in: ids }, activo: true }, select: selectUser });
  }

  async crearGrupo({ nombre, creadorId, participantUserIds }) {
    return prisma.chatConversation.create({
      data: {
        tipo: 'INTERNO_GRUPAL', estado: 'EN_CURSO', nombre, createdByUserId: creadorId,
        participants: { create: [
          { userId: creadorId, rol: 'ADMINISTRADOR' },
          ...participantUserIds.map((userId) => ({ userId, rol: 'MIEMBRO' })),
        ] },
      },
      include: conversationInclude,
    });
  }

  async buscarMiembroGrupoActivo(conversationId, userId) {
    return prisma.chatParticipant.findFirst({
      where: { conversationId, userId, leftAt: null,
        user: { activo: true }, conversation: { tipo: 'INTERNO_GRUPAL' } },
      select: { id: true, rol: true },
    });
  }

  async listarParticipantesGrupo(conversationId) {
    return prisma.chatParticipant.findMany({
      where: { conversationId, leftAt: null, user: { activo: true } },
      select: { id: true, userId: true, rol: true, user: { select: selectUser } },
      orderBy: { id: 'asc' },
    });
  }

  // Operaciones de membresia atomicas, con aislamiento serializable.
  async modificarMembresia({ conversationId, actorId, targetId, accion }) {
    const ejecutar = async () => prisma.$transaction(async (tx) => {
      const actor = await tx.chatParticipant.findFirst({
        where: { conversationId, userId: actorId, leftAt: null, user: { activo: true },
          conversation: { tipo: 'INTERNO_GRUPAL' } },
        select: { id: true, rol: true },
      });
      if (!actor) return { error: 'NOT_FOUND' };
      if (accion !== 'SALIR' && actor.rol !== 'ADMINISTRADOR') return { error: 'FORBIDDEN' };
      const miembro = await tx.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: targetId } },
        select: { id: true, rol: true, leftAt: true },
      });
      if (accion === 'AGREGAR') {
        const empleado = await tx.user.findFirst({ where: { id: targetId, activo: true }, select: { id: true } });
        if (!empleado) return { error: 'EMPLOYEE_NOT_FOUND' };
        if (miembro && !miembro.leftAt) return { error: 'ALREADY_MEMBER' };
        const result = miembro
          ? await tx.chatParticipant.update({ where: { id: miembro.id }, data: { leftAt: null, rol: 'MIEMBRO' } })
          : await tx.chatParticipant.create({ data: { conversationId, userId: targetId, rol: 'MIEMBRO' } });
        return { participante: result };
      }
      if (!miembro || miembro.leftAt) return { error: 'NOT_MEMBER' };
      if (miembro.rol === 'ADMINISTRADOR') {
        const admins = await tx.chatParticipant.count({
          where: { conversationId, rol: 'ADMINISTRADOR', leftAt: null, user: { activo: true } },
        });
        if (admins <= 1) return { error: 'LAST_ADMIN' };
      }
      const result = await tx.chatParticipant.update({
        where: { id: miembro.id }, data: { leftAt: new Date() },
      });
      return { participante: result };
    }, { isolationLevel: 'Serializable' });
    for (let intento = 0; intento < 3; intento++) {
      try { return await ejecutar(); }
      catch (error) {
        if (error.code === 'P2034' && intento < 2) continue;
        if (error.code === 'P2002') return { error: 'ALREADY_MEMBER' };
        throw error;
      }
    }
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
        conversation: { tipo: { in: ['INTERNO_PRIVADO', 'INTERNO_GRUPAL'] } },
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
