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

  async crearGrupo(req, res, next) {
    try {
      const grupo = await chatService.crearGrupo(req.body, req.user);
      return res.status(201).json({ success: true, message: 'Grupo creado.', data: grupo });
    } catch (error) { return next(error); }
  }

  async obtenerParticipantesGrupo(req, res, next) {
    try {
      const participantes = await chatService.obtenerParticipantesGrupo(
        Number(req.params.conversationId), req.user
      );
      return res.status(200).json({ success: true, data: { participants: participantes } });
    } catch (error) { return next(error); }
  }

  async agregarMiembroGrupo(req, res, next) {
    try {
      const data = await chatService.administrarMiembroGrupo(Number(req.params.conversationId), req.body, req.user, 'AGREGAR');
      return res.status(200).json({ success: true, message: 'Empleado incorporado.', data });
    } catch (error) { return next(error); }
  }

  async retirarMiembroGrupo(req, res, next) {
    try {
      const data = await chatService.administrarMiembroGrupo(Number(req.params.conversationId), { userId: Number(req.params.userId) }, req.user, 'RETIRAR');
      return res.status(200).json({ success: true, message: 'Empleado retirado.', data });
    } catch (error) { return next(error); }
  }

  async abandonarGrupo(req, res, next) {
    try {
      const data = await chatService.administrarMiembroGrupo(Number(req.params.conversationId), null, req.user, 'SALIR');
      return res.status(200).json({ success: true, message: 'Abandonaste el grupo.', data });
    } catch (error) { return next(error); }
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
