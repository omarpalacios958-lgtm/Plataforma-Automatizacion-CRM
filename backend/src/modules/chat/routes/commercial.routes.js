
'use strict';

const express = require('express');

const authMiddleware = require(
  '../../auth/middlewares/auth.middleware'
);

const controller = require(
  '../controllers/commercial.controller'
);

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/conversations',
  (req, res, next) => controller.listar(req, res, next)
);

// Ruta fija antes de la ruta con ID dinámico.
router.get(
  '/conversations/mine',
  (req, res, next) => controller.listarPropias(req, res, next)
);

router.get(
  '/conversations/:conversationId/messages',
  (req, res, next) => controller.listarMensajes(req, res, next)
);

router.post(
  '/conversations/:conversationId/messages',
  (req, res, next) => controller.enviarMensaje(req, res, next)
);

router.get(
  '/conversations/:conversationId',
  (req, res, next) => controller.obtener(req, res, next)
);

router.post(
  '/conversations/:conversationId/assign',
  (req, res, next) => controller.asignar(req, res, next)
);

module.exports = router;
