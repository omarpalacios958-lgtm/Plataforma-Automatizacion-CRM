const chatService = require('../services/chat.service');

class ChatController {
  async crearPrivada(req, res, next) {
    try {
      const resultado = await chatService.crearORecuperarPrivada(req.body, req.user);
      return res.status(resultado.creada ? 201 : 200).json({
        success: true,
        message: resultado.creada ? 'Conversacion creada.' : 'Conversacion existente.',
        data: resultado.conversacion,
      });
    } catch (error) {
      return next(error);
    }
  }

  async enviarMensaje(req, res, next) {
    try {
      const resultado = await chatService.enviarMensaje(Number(req.params.conversationId), req.body, req.user);
      return res.status(resultado.creado ? 201 : 200).json({
        success: true,
        message: resultado.creado ? 'Mensaje enviado.' : 'Mensaje existente.',
        data: resultado.mensaje,
      });
    } catch (error) { return next(error); }
  }

  async obtenerMensajes(req, res, next) {
    try {
      const resultado = await chatService.obtenerMensajes(Number(req.params.conversationId), req.query, req.user);
      return res.status(200).json({ success: true, data: resultado });
    } catch (error) { return next(error); }
  }

}

module.exports = new ChatController();
