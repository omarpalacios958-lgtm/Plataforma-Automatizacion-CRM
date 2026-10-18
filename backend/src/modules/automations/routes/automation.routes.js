
const express = require("express");

const automationController = require("../controllers/automation.controller");

const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

// Todas las rutas requieren autenticación y rol Administrador.
router.use(authMiddleware);
router.use(roleMiddleware("Administrador"));

// Obtener todas las automatizaciones.
router.get("/", automationController.obtenerTodos);

// Consultar el historial de una automatización.
router.get("/:id/ejecuciones", automationController.obtenerEjecuciones);

// Obtener una automatización por ID.
router.get("/:id", automationController.obtenerPorId);

// Crear una automatización.
router.post("/", automationController.crear);

// Actualizar una automatización.
router.put("/:id", automationController.actualizar);

// Desactivar una automatización.
router.patch("/:id/desactivar", automationController.desactivar);

module.exports = router;
