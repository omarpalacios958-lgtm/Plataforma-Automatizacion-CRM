const roleService = require("../services/role.service");

class RoleController {
    async obtenerTodos(req, res, next) {
        try {
            const resultado = await roleService.obtenerTodos();

            return res.status(200).json(resultado);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RoleController();