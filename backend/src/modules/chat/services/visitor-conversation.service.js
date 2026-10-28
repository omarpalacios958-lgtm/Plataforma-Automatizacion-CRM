'use strict';
const repository = require('../repositories/visitor-conversation.repository');
function error(status, message) { const e = new Error(message); e.status = status; return e; }
function validId(value) { return Number.isSafeInteger(Number(value)) && Number(value) > 0 && String(value).trim() !== ''; }
function assertVisitor(visitorId) { if (!validId(visitorId)) throw error(401, 'Identidad de visitante invalida.'); }
class VisitorConversationService {
  async abrir(visitorId) {
    assertVisitor(visitorId);
    return repository.abrirUnaSola(Number(visitorId));
  }
  async listar(visitorId) {
    assertVisitor(visitorId);
    return repository.listarPropias(Number(visitorId));
  }
  async obtener(visitorId, conversationId) {
    assertVisitor(visitorId);
    if (!validId(conversationId)) throw error(400, 'ID de conversacion invalido.');
    const conversation = await repository.buscarPropia(Number(visitorId), Number(conversationId));
    if (!conversation) throw error(404, 'Conversacion no encontrada.');
    return conversation;
  }
}
module.exports = new VisitorConversationService();
