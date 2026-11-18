
const express = require("express");
const router = express.Router();

const FileController = require("../controllers/file.controller");

const {
  validarCrearArchivo,
  validarActualizarArchivo
} = require("../validations/file.validation");

const {
  validarIdArchivo,
  validarAsociacionArchivo,
  validarExistenciaEntidad,
  validarExistenciaEntidadActualizacion,
  determinarEntidadArchivo,
  manejarErroresMulter
} = require("../middlewares/validation.middleware");

const authMiddleware = require(
  "../../auth/middlewares/auth.middleware"
);

const roleMiddleware = require(
  "../../auth/middlewares/role.middleware"
);

const upload = require("../../../config/multer");

// ============================================
// Middleware de carga temporal
// ============================================

const procesarArchivo = (req, res, next) => {
  upload.single("archivo")(req, res, error => {
    if (error) {
      return manejarErroresMulter(error, req, res, next);
    }

    next();
  });
};

// ============================================
// Consultar archivos
// ============================================

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

// ============================================
// Descargar archivo privado
// ============================================

router.get(
  "/:id/download",
  authMiddleware,
  roleMiddleware("Administrador", "Vendedor"),
  validarIdArchivo,
  FileController.descargar
);

// ============================================
// Crear archivo
// ============================================

router.post(
  "/:entity",
  authMiddleware,
  roleMiddleware("Administrador", "Vendedor"),
  procesarArchivo,
  validarCrearArchivo,
  validarAsociacionArchivo,
  validarExistenciaEntidad,
  FileController.crear
);

// ============================================
// Actualizar archivo
// ============================================

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("Administrador", "Vendedor"),
  validarIdArchivo,
  determinarEntidadArchivo,
  procesarArchivo,
  validarActualizarArchivo,
  validarExistenciaEntidadActualizacion,
  FileController.actualizar
);

// ============================================
// Eliminación lógica
// ============================================

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("Administrador", "Vendedor"),
  validarIdArchivo,
  FileController.eliminar
);

module.exports = router;
