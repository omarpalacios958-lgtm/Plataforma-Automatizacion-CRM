// ============================================
// Archivo: activity.routes.js
// Descripción:
// Define las rutas del módulo de
// Actividades.
// Todas las rutas requieren autenticación
// mediante JWT y autorización por roles.
// ============================================

const express = require("express");

const activityController = require("../controllers/activity.controller");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

// ============================================
// Rutas del módulo Actividades
// ============================================

// Obtener todas las actividades
router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    activityController.obtenerTodos
);

// Obtener una actividad por ID
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    activityController.obtenerPorId
);

// Crear una nueva actividad
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    activityController.crear
);

// Actualizar una actividad
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    activityController.actualizar
);

// Eliminación lógica
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    activityController.eliminar
);

module.exports = router;