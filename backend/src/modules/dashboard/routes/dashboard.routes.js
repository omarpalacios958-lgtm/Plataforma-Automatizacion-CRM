const express = require("express");

const dashboardController = require("../controllers/dashboard.controller");
const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

router.get(
    "/",
    authMiddleware,
    roleMiddleware("Administrador", "Vendedor", "Usuario"),
    dashboardController.obtenerEstadisticas
);

module.exports = router;