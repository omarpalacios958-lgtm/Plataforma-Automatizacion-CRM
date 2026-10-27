'use strict';
const prisma = require('../../../config/database');

const visitorSelect = { id: true, nombre: true, correo: true, registrado: true, activo: true };

class VisitorRepository {
  async crearInvitadoConSesion({ nombre, correo, tokenHash, expiresAt }) {
    return prisma.$transaction(async (tx) => {
      const visitor = await tx.chatVisitor.create({
        data: { nombre, correo, registrado: false, activo: true }, select: visitorSelect,
      });
      await tx.chatVisitorSession.create({
        data: { visitorId: visitor.id, tokenHash, expiresAt },
      });
      return visitor;
    });
  }

  async buscarSesionVigente(tokenHash, now) {
    return prisma.chatVisitorSession.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now }, visitor: { activo: true } },
      select: {
        id: true, expiresAt: true,
        visitor: { select: visitorSelect },
      },
    });
  }

  async revocarSesion(id, now) {
    return prisma.chatVisitorSession.updateMany({
      where: { id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
  }
}

module.exports = new VisitorRepository();
