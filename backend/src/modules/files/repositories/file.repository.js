// ============================================
// Archivo: file.repository.js
// Descripción:
// Repositorio del módulo Files.
// Gestiona las operaciones sobre la tabla File
// utilizando Prisma ORM.
// ============================================

const prisma = require("../../../config/database");

// ============================================

class FileRepository {

    /**
     * Obtiene todos los archivos activos.
     *
     * @returns {Promise<Array>}
     */
    async obtenerTodos() {

        return await prisma.file.findMany({

            where: {
                activo: true
            },

            include: {

                user: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true
                    }
                },

                company: true,

                contact: true,

                lead: true,

                opportunity: true

            },

            orderBy: {
                createdAt: "desc"
            }

        });

    }

    /**
     * Obtiene los archivos activos de un usuario.
     *
     * @param {number} userId
     * @returns {Promise<Array>}
     */
    async obtenerPorUsuario(userId) {

        return await prisma.file.findMany({

            where: {

                activo: true,

                userId

            },

            include: {

                user: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true
                    }
                },

                company: true,

                contact: true,

                lead: true,

                opportunity: true

            },

            orderBy: {
                createdAt: "desc"
            }

        });

    }

    /**
     * Obtiene un archivo activo por ID.
     *
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async obtenerPorId(id) {

        return await prisma.file.findFirst({

            where: {

                id,

                activo: true

            },

            include: {

                user: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true
                    }
                },

                company: true,

                contact: true,

                lead: true,

                opportunity: true

            }

        });

    }

    /**
     * Registra un nuevo archivo.
     *
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async crear(datos) {

        return await prisma.file.create({

            data: datos

        });

    }

    /**
     * Actualiza un archivo.
     *
     * @param {number} id
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async actualizar(id, datos) {

        return await prisma.file.update({

            where: {
                id
            },

            data: datos

        });

    }

    /**
     * Eliminación lógica.
     *
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async eliminar(id) {

        return await prisma.file.update({

            where: {
                id
            },

            data: {
                activo: false
            }

        });

    }

}

// ============================================

module.exports = new FileRepository();