// ============================================
// Archivo: task.routes.js
// Descripción:
// Define las rutas del módulo de
// Tareas.
// Todas las rutas requieren autenticación
// mediante JWT y autorización por roles.
// ============================================

const express = require("express");

const taskController = require("../controllers/task.controller");
const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

/**
 * Valida que el parámetro :id sea un entero positivo.
 */
function validarId(req, res, next) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "El ID de la tarea no es válido.",
    });
  }

  next();
}

router.use(authMiddleware);
router.use(roleMiddleware("Administrador", "Vendedor"));

router.get("/", taskController.obtenerTodos);
router.get("/:id", validarId, taskController.obtenerPorId);
router.post("/", taskController.crear);
router.put("/:id", validarId, taskController.actualizar);
router.delete("/:id", validarId, taskController.eliminar);

module.exports = router;