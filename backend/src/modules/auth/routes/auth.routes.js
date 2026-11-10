
/**
 * Rutas del módulo de autenticación.
 *
 * El registro de empleados se administra
 * exclusivamente desde /api/users,
 * mediante autenticación JWT y rol Administrador.
 */

const express = require("express");

const AuthController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Estado del módulo (requiere autenticación).
router.get(
    "/",
    authMiddleware,
    AuthController.verificarEstado
);

// Inicio de sesión.
router.post(
    "/login",
    AuthController.login
);

module.exports = router;
