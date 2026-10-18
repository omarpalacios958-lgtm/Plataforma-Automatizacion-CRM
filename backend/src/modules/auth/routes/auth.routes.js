// ============================================
// Archivo: auth.routes.js
// Descripción:
// Rutas del módulo de autenticación.
// ============================================

const express = require("express");

const AuthController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// ================================
// Rutas de autenticación
// ================================

// Estado del módulo
router.get("/", authMiddleware, AuthController.verificarEstado);

// Registro de usuarios
router.post("/register", AuthController.register);

// Inicio de sesión
router.post("/login", AuthController.login);

module.exports = router;