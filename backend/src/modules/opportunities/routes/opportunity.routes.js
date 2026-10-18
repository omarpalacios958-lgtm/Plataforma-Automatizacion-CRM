// ============================================
// Archivo: opportunity.routes.js
// Descripción:
// Define las rutas del módulo de
// Oportunidades.
// Todas las rutas requieren autenticación
// mediante JWT y autorización por roles.
// ============================================

const express = require("express");

const opportunityController = require("../controllers/opportunity.controller");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

// ============================================
// Rutas del módulo Oportunidades
// ============================================

// Obtener todas las oportunidades
router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    opportunityController.obtenerTodos
);

// Obtener una oportunidad por ID
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    opportunityController.obtenerPorId
);

// Crear una nueva oportunidad
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    opportunityController.crear
);

// Actualizar una oportunidad
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    opportunityController.actualizar
);

// Eliminación lógica
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    opportunityController.eliminar
);

module.exports = router;