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
  async marcarComoLeido({ conversationId, participantId, messageId }) {
    const ejecutar = () => prisma.$transaction(async (tx) => {
      const mensaje = await tx.chatMessage.findFirst({
        where: {
          id: messageId,
          conversationId,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      if (!mensaje) {
        return { error: 'MESSAGE_NOT_FOUND' };
      }

      const participante = await tx.chatParticipant.findFirst({
        where: {
          id: participantId,
          conversationId,
          leftAt: null,
          user: { activo: true },
          conversation: {
            tipo: {
              in: ['INTERNO_PRIVADO', 'INTERNO_GRUPAL'],
            },
          },
        },
        select: {
          id: true,
          conversationId: true,
          joinedAt: true,
          lastReadMessageId: true,
          lastReadAt: true,
        },
      });

      if (!participante) {
        return { error: 'PARTICIPANT_NOT_FOUND' };
      }

      // CH-05.6.2.4: el marcador de lectura solo puede avanzar
      // con mensajes del periodo actual de membresia.
      if (mensaje.createdAt <= participante.joinedAt) {
        return { error: 'MESSAGE_NOT_FOUND' };
      }

      if (
        participante.lastReadMessageId !== null &&
        participante.lastReadMessageId >= messageId
      ) {
        return {
          conversationId: participante.conversationId,
          lastReadMessageId: participante.lastReadMessageId,
          lastReadAt: participante.lastReadAt,
        };
      }

      const actualizado = await tx.chatParticipant.updateMany({
        where: {
          id: participantId,
          conversationId,
          leftAt: null,
          user: { activo: true },
          conversation: {
            tipo: {
              in: ['INTERNO_PRIVADO', 'INTERNO_GRUPAL'],
            },
          },
          OR: [
            { lastReadMessageId: null },
            { lastReadMessageId: { lt: messageId } },
          ],
        },
        data: {
          lastReadMessageId: messageId,
          lastReadAt: new Date(),
        },
      });

      const estado = await tx.chatParticipant.findFirst({
        where: {
          id: participantId,
          conversationId,
          leftAt: null,
          user: { activo: true },
          conversation: {
            tipo: {
              in: ['INTERNO_PRIVADO', 'INTERNO_GRUPAL'],
            },
          },
        },
        select: {
          conversationId: true,
          lastReadMessageId: true,
          lastReadAt: true,
        },
      });

      if (!estado) {
        return { error: 'PARTICIPANT_NOT_FOUND' };
      }

      if (actualizado.count === 0 && estado.lastReadMessageId === null) {
        throw new Error('No se pudo actualizar el marcador de lectura.');
      }

      return estado;
    }, {
      isolationLevel: 'Serializable',
    });

    for (let intento = 0; intento < 3; intento++) {
      try {
        return await ejecutar();
      } catch (error) {
        if (error.code === 'P2034' && intento < 2) {
          continue;
        }

        throw error;
      }
    }
  }
  async listarEmpleadosDisponibles(usuarioId) {
    return prisma.user.findMany({
      where: {
        activo: true,
        id: { not: usuarioId },
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
      },
      orderBy: [
        { apellido: 'asc' },
        { nombre: 'asc' },
        { id: 'asc' },
      ],
    });
  }


  async listarConversacionesInternas(usuarioId) {
    const conversaciones = await prisma.chatConversation.findMany({
      where: {
        tipo: {
          in: ['INTERNO_PRIVADO', 'INTERNO_GRUPAL'],
        },
        participants: {
          some: {
            userId: usuarioId,
            leftAt: null,
            user: { activo: true },
          },
        },
      },
      select: {
        id: true,
        tipo: true,
        estado: true,
        nombre: true,
        createdAt: true,
        updatedAt: true,
        participants: {
          where: {
            leftAt: null,
            user: { activo: true },
          },
          select: {
            id: true,
            userId: true,
            rol: true,
            user: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });

    if (conversaciones.length === 0) {
      return [];
    }

    const ids = conversaciones.map((conversacion) => conversacion.id);

    const participantesLectura = await prisma.chatParticipant.findMany({
      where: {
        conversationId: { in: ids },
        userId: usuarioId,
        leftAt: null,
        user: { activo: true },
      },
      select: {
        id: true,
        conversationId: true,
        joinedAt: true,
        lastReadMessageId: true,
        lastReadAt: true,
      },
    });

    const marcadores = new Map(
      participantesLectura.map((participante) => [
        participante.conversationId,
        participante,
      ])
    );

    // Siempre se respeta joinedAt; si existe marcador de lectura,
    // se aplica ademas id > lastReadMessageId.
    const filtros = participantesLectura.map((participante) => ({
      conversationId: participante.conversationId,
      participantId: { not: participante.id },
      deletedAt: null,
      createdAt: { gt: participante.joinedAt },
      ...(participante.lastReadMessageId !== null
        ? { id: { gt: participante.lastReadMessageId } }
        : {}),
    }));

    const conteos = filtros.length > 0
      ? await prisma.chatMessage.groupBy({
          by: ['conversationId'],
          where: { OR: filtros },
          _count: { _all: true },
        })
      : [];

    const contadores = new Map(
      conteos.map((registro) => [
        registro.conversationId,
        registro._count._all,
      ])
    );

    return conversaciones.map((conversacion) => {
      const marcador = marcadores.get(conversacion.id);

      return {
        ...conversacion,
        lastReadMessageId: marcador?.lastReadMessageId ?? null,
        lastReadAt: marcador?.lastReadAt ?? null,
        unreadCount: contadores.get(conversacion.id) ?? 0,
      };
    });
  }

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
          ? await tx.chatParticipant.update({
              where: { id: miembro.id },
              data: {
                leftAt: null,
                joinedAt: new Date(),
                rol: 'MIEMBRO',
                lastReadMessageId: null,
                lastReadAt: null,
              },
            })
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

  async listarMensajes({ conversationId, cursor, afterId = null, limit }) {
    const incremental = afterId !== null;

    const mensajes = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(incremental
          ? { id: { gt: afterId } }
          : cursor
            ? { id: { lt: cursor } }
            : {}),
      },
      orderBy: { id: incremental ? 'asc' : 'desc' },
      take: limit + 1,
      select: {
        id: true,
        conversationId: true,
        participantId: true,
        contenido: true,
        clientMessageId: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
      },
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