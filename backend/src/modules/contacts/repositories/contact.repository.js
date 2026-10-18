// ============================================
// Archivo: contact.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de contactos mediante Prisma.
// ============================================

const prisma = require("../../../config/database");

class ContactRepository {

    /**
     * Obtiene todos los contactos.
     */
    async obtenerTodos() {

        return await prisma.contact.findMany({

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
                        activo: true,
                        role: {
                            select: {
                                id: true,
                                nombre: true,
                                descripcion: true
                            }
                        }
                    }
                }
            },

            orderBy: {
                id: "asc"
            }

        });

    }

    /**
     * Obtiene todos los contactos de un usuario.
     *
     * @param {number} userId
     */
    async obtenerPorUsuario(userId) {

        return await prisma.contact.findMany({

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
                        activo: true,
                        role: {
                            select: {
                                id: true,
                                nombre: true,
                                descripcion: true
                            }
                        }
                    }
                }
            },

            orderBy: {
                id: "asc"
            }

        });

    }

    /**
     * Obtiene un contacto por ID.
     *
     * @param {number} id
     */
    async obtenerPorId(id) {

        return await prisma.contact.findUnique({

            where: {
                id
            },

            include: {
                user: {
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        correo: true,
                        activo: true,
                        role: {
                            select: {
                                id: true,
                                nombre: true,
                                descripcion: true
                            }
                        }
                    }
                }
            }

        });

    }

    /**
     * Crea un nuevo contacto.
     *
     * @param {Object} datos
     */
    async crear(datos) {

        return await prisma.contact.create({

            data: datos

        });

    }

    /**
     * Actualiza un contacto.
     *
     * @param {number} id
     * @param {Object} datos
     */
    async actualizar(id, datos) {

        return await prisma.contact.update({

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
     */
    async eliminar(id) {

        return await prisma.contact.update({

            where: {
                id
            },

            data: {
                activo: false
            }

        });

    }

}

module.exports = new ContactRepository();