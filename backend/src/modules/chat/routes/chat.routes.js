const express = require('express');
const authMiddleware = require('../../auth/middlewares/auth.middleware');
const chatController = require('../controllers/chat.controller');

const router = express.Router();
router.post('/groups', authMiddleware, (req, res, next) => chatController.crearGrupo(req, res, next));
router.get('/groups/:conversationId/participants', authMiddleware,
  (req, res, next) => chatController.obtenerParticipantesGrupo(req, res, next));
router.post('/groups/:conversationId/participants', authMiddleware,
  (req, res, next) => chatController.agregarMiembroGrupo(req, res, next));
router.delete('/groups/:conversationId/participants/me', authMiddleware,
  (req, res, next) => chatController.abandonarGrupo(req, res, next));
router.delete('/groups/:conversationId/participants/:userId', authMiddleware,
  (req, res, next) => chatController.retirarMiembroGrupo(req, res, next));
router.post('/private', authMiddleware, (req, res, next) => chatController.crearPrivada(req, res, next));
router.post('/conversations/:conversationId/messages', authMiddleware,
  (req, res, next) => chatController.enviarMensaje(req, res, next));
router.get('/conversations/:conversationId/messages', authMiddleware,
  (req, res, next) => chatController.obtenerMensajes(req, res, next));
module.exports = router;
