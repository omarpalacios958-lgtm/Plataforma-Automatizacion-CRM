// ============================================
// Archivo: notification.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de Notificaciones mediante Prisma ORM.
// ============================================

const prisma = require("../../../config/database");

class NotificationRepository {

    /**
     * Obtiene todas las notificaciones activas.
     */
    async obtenerTodos() {

        return await prisma.notification.findMany({

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

                }

            },

            orderBy: {
                id: "asc"
            }

        });

    }

    /**
     * Obtiene las notificaciones activas
     * pertenecientes a un usuario.
     *
     * @param {number} userId
     */
    async obtenerPorUsuario(userId) {

        return await prisma.notification.findMany({

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

                }

            },

            orderBy: {
                id: "asc"
            }

        });

    }

    /**
     * Obtiene una notificación por ID.
     *
     * @param {number} id
     */
    async obtenerPorId(id) {

        return await prisma.notification.findUnique({

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

                        role: {

                            select: {

                                id: true,
                                nombre: true

                            }

                        }

                    }

                }

            }

        });

    }

    /**
     * Crea una nueva notificación.
     *
     * @param {Object} datos
     */
    async crear(datos) {

        return await prisma.notification.create({

            data: datos

        });

    }

    /**
     * Actualiza una notificación.
     *
     * @param {number} id
     * @param {Object} datos
     */
    async actualizar(id, datos) {

        return await prisma.notification.update({

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

        return await prisma.notification.update({

            where: {
                id
            },

            data: {
                activo: false
            }

        });

    }

}

module.exports = new NotificationRepository();