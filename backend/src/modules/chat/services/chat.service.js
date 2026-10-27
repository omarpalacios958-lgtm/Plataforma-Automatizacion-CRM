const chatRepository = require('../repositories/chat.repository');
const { validarId, validarDestinatario, validarEnvio, validarPaginacion, validarGrupo } = require('../validations/chat.validation');

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

  async crearGrupo(datos, usuarioAutenticado) {
    const creadorId = usuarioAutenticado?.id;
    if (!validarId(creadorId)) throw httpError(401, 'Identidad de usuario no valida.');
    const { nombre, participantUserIds } = validarGrupo(datos, creadorId);
    const ids = [creadorId, ...participantUserIds];
    const activos = await chatRepository.buscarEmpleadosActivos(ids);
    if (!activos.some((empleado) => empleado.id === creadorId)) {
      throw httpError(403, 'El usuario autenticado no esta activo.');
    }
    if (new Set(activos.map((empleado) => empleado.id)).size !== ids.length) {
      throw httpError(404, 'Uno o mas empleados invitados no existen o estan inactivos.');
    }
    return chatRepository.crearGrupo({ nombre, creadorId, participantUserIds });
  }

  async obtenerParticipantesGrupo(conversationId, usuarioAutenticado) {
    if (!validarId(usuarioAutenticado?.id)) throw httpError(401, 'Identidad de usuario no valida.');
    if (!validarId(conversationId)) throw httpError(400, 'ID de conversacion no valido.');
    const miembro = await chatRepository.buscarMiembroGrupoActivo(conversationId, usuarioAutenticado.id);
    if (!miembro) throw httpError(404, 'Grupo no encontrado.');
    return chatRepository.listarParticipantesGrupo(conversationId);
  }

  async verificarAcceso(conversationId, usuarioAutenticado) {
    if (!validarId(usuarioAutenticado?.id)) {
      throw httpError(401, 'Identidad de usuario no valida.');
    }
    if (!validarId(conversationId)) {
      throw httpError(400, 'ID de conversacion no valido.');
    }
    const participante = await chatRepository.buscarParticipanteActivo(
      conversationId, usuarioAutenticado.id
    );
    if (!participante) {
      // No revelar si la conversacion existe o pertenece a otro empleado.
      throw httpError(404, 'Conversacion no encontrada.');
    }
    return participante;
  }

  async enviarMensaje(conversationId, datos, usuarioAutenticado) {
    const participante = await this.verificarAcceso(conversationId, usuarioAutenticado);
    const { contenido, clientMessageId } = validarEnvio(datos);
    const existente = await chatRepository.buscarMensajePorClave(participante.id, clientMessageId);
    if (existente) return this.resolverReintento(existente, contenido, conversationId);
    try {
      const mensaje = await chatRepository.crearMensaje({
        conversationId, participantId: participante.id, contenido, clientMessageId,
      });
      return { creado: true, mensaje };
    } catch (error) {
      if (error.code === 'P2002') {
        const repetido = await chatRepository.buscarMensajePorClave(participante.id, clientMessageId);
        if (repetido) return this.resolverReintento(repetido, contenido, conversationId);
      }
      throw error;
    }
  }

  resolverReintento(existente, contenido, conversationId) {
    if (existente.conversationId !== conversationId || existente.contenido !== contenido) {
      throw httpError(409, 'clientMessageId ya fue utilizado para otro mensaje.');
    }
    return { creado: false, mensaje: existente };
  }

  async obtenerMensajes(conversationId, query, usuarioAutenticado) {
    await this.verificarAcceso(conversationId, usuarioAutenticado);
    const pagina = validarPaginacion(query);
    return chatRepository.listarMensajes({ conversationId, ...pagina });
  }

}

module.exports = new ChatService();
