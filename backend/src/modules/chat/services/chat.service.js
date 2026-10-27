const chatRepository = require('../repositories/chat.repository');
const { validarId, validarDestinatario } = require('../validations/chat.validation');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class ChatService {
  async crearORecuperarPrivada(datos, usuarioAutenticado) {
    const emisorId = usuarioAutenticado && usuarioAutenticado.id;
    if (!validarId(emisorId)) {
      throw httpError(401, 'Identidad de usuario no valida.');
    }

    const destinatarioId = validarDestinatario(datos);
    if (emisorId === destinatarioId) {
      throw httpError(400, 'No puedes crear una conversacion contigo mismo.');
    }

    const [emisor, destinatario] = await Promise.all([
      chatRepository.buscarEmpleadoActivo(emisorId),
      chatRepository.buscarEmpleadoActivo(destinatarioId),
    ]);
    if (!emisor) throw httpError(403, 'El usuario autenticado no esta activo.');
    if (!destinatario) throw httpError(404, 'Destinatario no encontrado o inactivo.');

    const privatePairKey = [emisorId, destinatarioId].sort((a, b) => a - b).join(':');
    const existente = await chatRepository.buscarPrivada(privatePairKey);
    if (existente) return { creada: false, conversacion: existente };

    try {
      const conversacion = await chatRepository.crearPrivada({
        privatePairKey,
        emisorId,
        destinatarioId,
      });
      return { creada: true, conversacion };
    } catch (error) {
      // Dos solicitudes simultaneas pueden intentar insertar la misma pareja.
      if (error.code === 'P2002') {
        const conversacion = await chatRepository.buscarPrivada(privatePairKey);
        if (conversacion) return { creada: false, conversacion };
      }
      throw error;
    }
  }
}

module.exports = new ChatService();
