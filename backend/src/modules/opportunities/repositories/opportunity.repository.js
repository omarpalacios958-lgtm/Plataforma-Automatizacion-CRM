// ============================================
// Archivo: opportunity.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de Oportunidades mediante Prisma ORM.
// ============================================

const prisma = require("../../../config/database");

class OpportunityRepository {

    /**
     * Obtiene todas las oportunidades activas.
     */
    async obtenerTodos() {

        return await prisma.opportunity.findMany({

            where: {
                activo: true
            },

            include: {

                lead: {

                    select: {

                        id: true,
                        titulo: true,
                        estado: true,
                        prioridad: true,

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
     * Obtiene las oportunidades activas
     * pertenecientes a un usuario.
     *
     * @param {number} userId
     */
    async obtenerPorUsuario(userId) {

        return await prisma.opportunity.findMany({

            where: {

                activo: true,
                userId

            },

            include: {

                lead: {

                    select: {

                        id: true,
                        titulo: true,
                        estado: true,
                        prioridad: true,

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
     * Obtiene una oportunidad por ID.
     *
     * @param {number} id
     */
    async obtenerPorId(id) {

        return await prisma.opportunity.findUnique({

            where: {
                id
            },

            include: {

                lead: {

                    select: {

                        id: true,
                        titulo: true,
                        estado: true,
                        prioridad: true,

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
     * Crea una nueva oportunidad.
     *
     * @param {Object} datos
     */
    async crear(datos) {

        return await prisma.opportunity.create({

            data: datos

        });

    }

    /**
     * Actualiza una oportunidad.
     *
     * @param {number} id
     * @param {Object} datos
     */
    async actualizar(id, datos) {

        return await prisma.opportunity.update({

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

        return await prisma.opportunity.update({

            where: {
                id
            },

            data: {
                activo: false
            }

        });

    }

}

module.exports = new OpportunityRepository();