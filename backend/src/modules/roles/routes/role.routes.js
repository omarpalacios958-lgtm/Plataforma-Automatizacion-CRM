const express = require("express");
const roleController = require("../controllers/role.controller");
const authMiddleware = require("../../auth/middlewares/auth.middleware");
const roleMiddleware = require("../../auth/middlewares/role.middleware");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("Administrador"));

router.get("/", roleController.obtenerTodos);

module.exports = router;