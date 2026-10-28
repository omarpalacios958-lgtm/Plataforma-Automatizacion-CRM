'use strict';
const visitorService = require('../services/visitor.service');

class VisitorController {
  async crearSesion(req, res, next) {
    try {
      const data = await visitorService.crearSesion(req.body);
      res.set('Cache-Control', 'no-store');
      return res.status(201).json({ success: true, message: 'Sesion de visitante creada.', data });
    } catch (error) { return next(error); }
  }

  async consultarSesion(req, res, next) {
    try {
      res.set('Cache-Control', 'no-store');
      const { visitor, expiresAt } = req.visitorSession;
      return res.status(200).json({ success: true, data: { visitor, expiresAt } });
    } catch (error) { return next(error); }
  }

  async abrirConversacion(req, res, next) {
    try {
      const result = await require('../services/visitor-conversation.service').abrir(req.visitorSession.visitor.id);
      res.set('Cache-Control', 'no-store');
      return res.status(result.creada ? 201 : 200).json({ success: true, data: result.conversacion, creada: result.creada });
    } catch (error) { return next(error); }
  }

  async listarConversaciones(req, res, next) {
    try {
      const data = await require('../services/visitor-conversation.service').listar(req.visitorSession.visitor.id);
      res.set('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, data });
    } catch (error) { return next(error); }
  }

  async consultarConversacion(req, res, next) {
    try {
      const data = await require('../services/visitor-conversation.service').obtener(req.visitorSession.visitor.id, req.params.conversationId);
      res.set('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, data });
    } catch (error) { return next(error); }
  }

  async cerrarSesion(req, res, next) {
    try {
      await visitorService.cerrarSesion(req.visitorSession.id);
      res.set('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, message: 'Sesion cerrada.' });
    } catch (error) { return next(error); }
  }
}

module.exports = new VisitorController();
