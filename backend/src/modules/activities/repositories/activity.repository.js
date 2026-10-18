// ============================================
// Archivo: activity.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de Actividades mediante Prisma ORM.
// ============================================

const prisma = require("../../../config/database");

class ActivityRepository {

    /**
     * Obtiene todas las actividades activas.
     */
    async obtenerTodos() {

        return await prisma.activity.findMany({

            where: {
                activo: true
            },

            include: {

                opportunity: {

                    select: {

                        id: true,
                        nombre: true,
                        etapa: true,

                        lead: {

                            select: {

                                id: true,
                                titulo: true,

                                contact: {

                                    select: {

                                        id: true,
                                        nombre: true,
                                        apellido: true,

                                        company: {

                                            select: {

                                                id: true,
                                                nombre: true

                                            }

                                        }

                                    }

                                }

                            }

                        }

                    }

                },

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
     * Obtiene actividades activas de un usuario.
     *
     * @param {number} userId
     */
    async obtenerPorUsuario(userId) {

        return await prisma.activity.findMany({

            where: {

                activo: true,
                userId

            },

            include: {

                opportunity: {

                    select: {

                        id: true,
                        nombre: true,
                        etapa: true,

                        lead: {

                            select: {

                                id: true,
                                titulo: true,

                                contact: {

                                    select: {

                                        id: true,
                                        nombre: true,
                                        apellido: true,

                                        company: {

                                            select: {

                                                id: true,
                                                nombre: true

                                            }

                                        }

                                    }

                                }

                            }

                        }

                    }

                },

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
     * Obtiene una actividad por ID.
     *
     * @param {number} id
     */
    async obtenerPorId(id) {

        return await prisma.activity.findUnique({

            where: {
                id
            },

            include: {

                opportunity: {

                    select: {

                        id: true,
                        nombre: true,
                        etapa: true,

                        lead: {

                            select: {

                                id: true,
                                titulo: true,

                                contact: {

                                    select: {

                                        id: true,
                                        nombre: true,
                                        apellido: true,

                                        company: {

                                            select: {

                                                id: true,
                                                nombre: true

                                            }

                                        }

                                    }

                                }

                            }

                        }

                    }

                },

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
     * Crea una actividad.
     *
     * @param {Object} datos
     */
    async crear(datos) {

        return await prisma.activity.create({

            data: datos

        });

    }

    /**
     * Actualiza una actividad.
     *
     * @param {number} id
     * @param {Object} datos
     */
    async actualizar(id, datos) {

        return await prisma.activity.update({

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

        return await prisma.activity.update({

            where: {
                id
            },

            data: {

                activo: false

            }

        });

    }

}

module.exports = new ActivityRepository();