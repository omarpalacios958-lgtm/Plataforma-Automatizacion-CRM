// ============================================
// Archivo: contact.routes.js
// Descripción:
// Define las rutas del módulo de contactos.
// Todas las rutas requieren autenticación
// mediante JWT y autorización por roles.
// ============================================

const express = require("express");

const contactController = require("../controllers/contact.controller");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

// ============================================
// Rutas del módulo Contactos
// ============================================

// Obtener todos los contactos
router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    contactController.obtenerTodos
);

// Obtener un contacto por ID
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    contactController.obtenerPorId
);

// Crear un nuevo contacto
router.post(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    contactController.crear
);

// Actualizar un contacto
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    contactController.actualizar
);

// Eliminación lógica de un contacto
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    contactController.eliminar
);

module.exports = router;