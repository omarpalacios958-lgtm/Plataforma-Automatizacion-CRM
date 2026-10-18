// ============================================
// Archivo: file.routes.js
// Descripción:
// Define las rutas del módulo Files.
// Todas las rutas requieren autenticación
// mediante JWT y autorización por roles.
// ============================================

const express = require("express");
const router = express.Router();

const FileController = require("../controllers/file.controller");

const {
    validarCrearArchivo,
    validarActualizarArchivo
} = require("../validations/file.validation");

const {
    validarIdArchivo,
    limpiarArchivoSubidoSiFalla,
    validarAsociacionArchivo,
    validarExistenciaEntidad,
    validarExistenciaEntidadActualizacion,
    determinarEntidadArchivo,
    manejarErroresMulter
} = require("../middlewares/validation.middleware");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const upload = require("../../../config/multer");

router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    FileController.obtenerTodos
);

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    validarIdArchivo,
    FileController.obtenerPorId
);

router.post(
    "/:entity",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    (req, res, next) => {
        upload.single("archivo")(req, res, (error) => {
            if (error) {
                return manejarErroresMulter(error, req, res, next);
            }

            next();
        });
    },
    limpiarArchivoSubidoSiFalla,
    validarCrearArchivo,
    validarAsociacionArchivo,
    validarExistenciaEntidad,
    FileController.crear
);

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    validarIdArchivo,
    determinarEntidadArchivo,
    (req, res, next) => {
        upload.single("archivo")(req, res, (error) => {
            if (error) {
                return manejarErroresMulter(error, req, res, next);
            }

            next();
        });
    },
    limpiarArchivoSubidoSiFalla,
    validarActualizarArchivo,
    validarExistenciaEntidadActualizacion,
    FileController.actualizar
);

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor"),
    validarIdArchivo,
    FileController.eliminar
);

module.exports = router;