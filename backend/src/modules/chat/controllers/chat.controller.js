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
}

module.exports = new ChatController();
