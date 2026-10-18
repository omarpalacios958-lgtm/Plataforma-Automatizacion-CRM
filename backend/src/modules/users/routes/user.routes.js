// ============================================
// Archivo: user.routes.js
// Descripción:
// Rutas del módulo de usuarios.
// Todas las rutas están protegidas mediante
// autenticación JWT y autorización por roles.
// ============================================

const express = require("express");

const userController = require("../controllers/user.controller");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

// ============================================
// Rutas del módulo Users
// ============================================

// Obtener todos los usuarios
router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador"),
    userController.obtenerTodos
);

// Obtener usuario por ID
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador"),
    userController.obtenerPorId
);

// Crear un nuevo usuario
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Administrador"),
    userController.crear
);

// Actualizar usuario
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador"),
    userController.actualizar
);

// Eliminar usuario (eliminación lógica)
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador"),
    userController.eliminar
);

module.exports = router;