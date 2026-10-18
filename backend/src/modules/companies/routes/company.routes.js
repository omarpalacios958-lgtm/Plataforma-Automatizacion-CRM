// ============================================
// Archivo: company.routes.js
// Descripción:
// Define las rutas del módulo Companies.
// ============================================

const express = require("express");

const router = express.Router();

const CompanyController = require("../controllers/company.controller");

const {
    validarCrearEmpresa,
    validarActualizarEmpresa
} = require("../validations/company.validation");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");
const validationMiddleware = require("../../../middlewares/validation.middleware");

// ============================================
// Obtener todas las empresas
// ============================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    CompanyController.obtenerTodas
);

// ============================================
// Obtener empresa por ID
// ============================================

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    CompanyController.obtenerPorId
);

// ============================================
// Crear empresa
// ============================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    validarCrearEmpresa,
    validationMiddleware,
    CompanyController.crear
);

// ============================================
// Actualizar empresa
// ============================================

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    validarActualizarEmpresa,
    validationMiddleware,
    CompanyController.actualizar
);

// ============================================
// Eliminación lógica
// ============================================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    CompanyController.eliminar
);

module.exports = router;