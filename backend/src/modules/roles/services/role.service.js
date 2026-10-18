const roleRepository = require("../repositories/role.repository");

class RoleService {
    async obtenerTodos() {
        const roles = await roleRepository.obtenerTodos();

        return {
            success: true,
            data: roles
        };
    }
}

module.exports = new RoleService();