'use strict';

const service = require('../services/commercial.service');
const messageService = require(
  '../services/commercial-message.service'
);

class CommercialController {
  async listar(req, res, next) {
    try {
      const data = await service.listar(req.user, req.query);

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async listarPropias(req, res, next) {
    try {
      const data = await service.listarPropias(
        req.user,
        req.query
      );

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async obtener(req, res, next) {
    try {
      const data = await service.obtener(
        req.user,
        req.params.conversationId
      );

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async asignar(req, res, next) {
    try {
      const data = await service.asignar(
        req.user,
        req.params.conversationId
      );

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async cambiarEstado(req, res, next) {
    try {
      const data = await service.cambiarEstado(
        req.user,
        req.params.conversationId,
        req.body
      );

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async listarMensajes(req, res, next) {
    try {
      const data = await messageService.listar(
        req.user,
        req.params.conversationId,
        req.query
      );

      res.set('Cache-Control', 'no-store');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async enviarMensaje(req, res, next) {
    try {
      const result = await messageService.enviar(
        req.user,
        req.params.conversationId,
        req.body
      );

      res.set('Cache-Control', 'no-store');

      return res.status(result.creado ? 201 : 200).json({
        success: true,
        data: result.mensaje,
        creado: result.creado,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new CommercialController();