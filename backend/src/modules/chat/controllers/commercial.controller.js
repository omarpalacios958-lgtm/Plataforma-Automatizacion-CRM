'use strict';
const service = require('../services/commercial.service');
class CommercialController {
  async listar(req, res, next) {
    try {
      const data = await service.listar(req.user, req.query);
      res.set('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, data });
    } catch (error) { return next(error); }
  }
  async obtener(req, res, next) {
    try {
      const data = await service.obtener(req.user, req.params.conversationId);
      res.set('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, data });
    } catch (error) { return next(error); }
  }
  async asignar(req, res, next) {
    try {
      const data = await service.asignar(req.user, req.params.conversationId);
      res.set('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, data });
    } catch (error) { return next(error); }
  }
}
module.exports = new CommercialController();
