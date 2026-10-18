const prisma = require("../../../config/database");

class RoleRepository {
    async obtenerTodos() {
        return await prisma.role.findMany({
            orderBy: {
                id: "asc"
            }
        });
    }
}

module.exports = new RoleRepository();