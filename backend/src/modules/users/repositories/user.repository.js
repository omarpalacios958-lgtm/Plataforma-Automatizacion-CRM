// ============================================
// Archivo: user.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de usuarios mediante Prisma.
// ============================================

const prisma = require("../../../config/database");

class UserRepository {

    /**
     * Obtiene todos los usuarios activos.
     *
     * @returns {Promise<Array>}
     */
    async obtenerTodos() {

        return await prisma.user.findMany({

            where: {
                activo: true
            },

            include: {
                role: true
            },

            orderBy: {
                id: "asc"
            }

        });

    }

    /**
     * Obtiene un usuario activo por su ID.
     *
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async obtenerPorId(id) {

        return await prisma.user.findFirst({

            where: {
                id,
                activo: true
            },

            include: {
                role: true
            }

        });

    }

    /**
     * Busca un usuario por correo.
     *
     * @param {string} correo
     * @returns {Promise<Object|null>}
     */
    async buscarPorCorreo(correo) {

        return await prisma.user.findUnique({

            where: {
                correo
            }

        });

    }

    /**
     * Busca un rol por su ID.
     *
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async buscarRolPorId(id) {

        return await prisma.role.findUnique({

            where: {
                id
            }

        });

    }

    /**
     * Crea un nuevo usuario.
     *
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async crear(datos) {

        return await prisma.user.create({

            data: datos,

            include: {
                role: true
            }

        });

    }

    /**
     * Actualiza un usuario.
     *
     * @param {number} id
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async actualizar(id, datos) {

        return await prisma.user.update({

            where: {
                id
            },

            data: datos,

            include: {
                role: true
            }

        });

    }

    /**
     * Busca un usuario por ID.
     *
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async buscarPorId(id) {

        return await prisma.user.findUnique({

            where: {
                id
            }

        });

    }

    /**
     * Realiza la eliminación lógica de un usuario.
     *
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async eliminar(id) {

        return await prisma.user.update({

            where: {
                id
            },

            data: {
                activo: false
            },

            include: {
                role: true
            }

        });

    }

}

module.exports = new UserRepository();