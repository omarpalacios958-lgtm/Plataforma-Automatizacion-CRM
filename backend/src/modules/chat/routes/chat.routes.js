const express = require('express');
const authMiddleware = require('../../auth/middlewares/auth.middleware');
const chatController = require('../controllers/chat.controller');

const router = express.Router();
router.post('/private', authMiddleware, (req, res, next) => chatController.crearPrivada(req, res, next));
module.exports = router;
