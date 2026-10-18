// ============================================
// Archivo: lead.routes.js
// Descripción:
// Define las rutas del módulo de Leads.
// Todas las rutas requieren autenticación
// mediante JWT y autorización por roles.
// ============================================

const express = require("express");

const leadController = require("../controllers/lead.controller");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

// ============================================
// Rutas del módulo Leads
// ============================================

// Obtener todos los leads
router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    leadController.obtenerTodos
);

// Obtener un lead por ID
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    leadController.obtenerPorId
);

// Crear un nuevo lead
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    leadController.crear
);

// Actualizar un lead
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    leadController.actualizar
);

// Eliminación lógica
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    leadController.eliminar
);

module.exports = router;