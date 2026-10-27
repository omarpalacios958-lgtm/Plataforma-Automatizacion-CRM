'use strict';
const express = require('express');
const controller = require('../controllers/visitor.controller');
const visitorAuth = require('../middlewares/visitor-auth.middleware');
const rateLimit = require('../middlewares/visitor-rate-limit.middleware');

const router = express.Router();
router.post('/guest-session', rateLimit, (req, res, next) => controller.crearSesion(req, res, next));
router.get('/session', visitorAuth, (req, res, next) => controller.consultarSesion(req, res, next));
router.post('/logout', visitorAuth, (req, res, next) => controller.cerrarSesion(req, res, next));
module.exports = router;
