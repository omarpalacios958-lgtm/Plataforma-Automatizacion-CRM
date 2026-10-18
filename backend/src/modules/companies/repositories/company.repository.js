// ============================================
// Archivo: company.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de empresas mediante Prisma.
// ============================================

const prisma = require("../../../config/database");

class CompanyRepository {

    /**
     * Obtiene todas las empresas activas.
     *
     * @returns {Promise<Array>}
     */
    async obtenerTodos() {

        return await prisma.company.findMany({

            where: {
                activo: true
            },

            include: {

                user: {

                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        correo: true,

                        role: {
                            select: {
                                id: true,
                                nombre: true
                            }
                        }
                    }

                },

                contacts: true

            },

            orderBy: {
                id: "asc"
            }

        });

    }

    /**
     * Obtiene todas las empresas de un usuario.
     *
     * @param {number} userId
     * @returns {Promise<Array>}
     */
    async obtenerPorUsuario(userId) {

        return await prisma.company.findMany({

            where: {
                activo: true,
                userId
            },

            include: {

                user: {

                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        correo: true,

                        role: {
                            select: {
                                id: true,
                                nombre: true
                            }
                        }
                    }

                },

                contacts: true

            },

            orderBy: {
                id: "asc"
            }

        });

    }

    /**
     * Obtiene una empresa por ID.
     *
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    async obtenerPorId(id) {

        return await prisma.company.findFirst({

            where: {
                id,
                activo: true
            },

            include: {

                user: {

                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        correo: true,

                        role: {
                            select: {
                                id: true,
                                nombre: true
                            }
                        }
                    }

                },

                contacts: true

            }

        });

    }

    /**
     * Crea una nueva empresa.
     *
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async crear(datos) {

        return await prisma.company.create({

            data: datos

        });

    }

    /**
     * Actualiza una empresa.
     *
     * @param {number} id
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async actualizar(id, datos) {

        return await prisma.company.update({

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

        return await prisma.company.update({

            where: {
                id
            },

            data: {
                activo: false
            }

        });

    }

}

module.exports = new CompanyRepository();