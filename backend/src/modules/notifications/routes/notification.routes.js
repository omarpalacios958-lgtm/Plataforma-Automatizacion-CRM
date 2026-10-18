// ============================================
// Archivo: notification.routes.js
// Descripción:
// Define las rutas del módulo de
// Notificaciones.
// Todas las rutas requieren autenticación
// mediante JWT y autorización por roles.
// ============================================

const express = require("express");

const notificationController = require("../controllers/notification.controller");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

// ============================================
// Rutas del módulo Notificaciones
// ============================================

// Obtener todas las notificaciones
router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    notificationController.obtenerTodos
);

// Obtener una notificación por ID
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    notificationController.obtenerPorId
);

// Crear una nueva notificación
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    notificationController.crear
);

// Actualizar una notificación
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    notificationController.actualizar
);

// Eliminación lógica
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    notificationController.eliminar
);

module.exports = router;