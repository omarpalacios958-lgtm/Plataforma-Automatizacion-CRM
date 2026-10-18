// ============================================
// Archivo: task.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de Tareas mediante Prisma ORM.
// ============================================

const prisma = require("../../../config/database");

class TaskRepository {

    /**
     * Obtiene todas las tareas activas.
     */
    async obtenerTodos() {

        return await prisma.task.findMany({

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
     * Obtiene las tareas activas de un usuario.
     *
     * @param {number} userId
     */
    async obtenerPorUsuario(userId) {

        return await prisma.task.findMany({

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
     * Obtiene una tarea por ID.
     *
     * @param {number} id
     */
    async obtenerPorId(id) {

        return await prisma.task.findUnique({

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
     * Crea una nueva tarea.
     *
     * @param {Object} datos
     */
    async crear(datos) {

        return await prisma.task.create({

            data: datos

        });

    }

    /**
     * Actualiza una tarea.
     *
     * @param {number} id
     * @param {Object} datos
     */
    async actualizar(id, datos) {

        return await prisma.task.update({

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

        return await prisma.task.update({

            where: {
                id
            },

            data: {
                activo: false
            }

        });

    }

}

module.exports = new TaskRepository();