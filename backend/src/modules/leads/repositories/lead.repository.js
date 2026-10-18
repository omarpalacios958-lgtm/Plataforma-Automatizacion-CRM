// ============================================
// Archivo: lead.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de Leads mediante Prisma ORM.
// ============================================

const prisma = require("../../../config/database");

class LeadRepository {

    /**
     * Obtiene todos los leads activos.
     */
    async obtenerTodos() {

        return await prisma.lead.findMany({

            where: {
                activo: true
            },

            include: {

                contact: {

                    select: {

                        id: true,
                        nombre: true,
                        apellido: true,
                        correo: true,
                        telefono: true,
                        puesto: true,

                        company: {

                            select: {

                                id: true,
                                nombre: true,
                                razonSocial: true

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
                        activo: true,

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
     * Obtiene todos los leads activos de un usuario.
     *
     * @param {number} userId
     */
    async obtenerPorUsuario(userId) {

        return await prisma.lead.findMany({

            where: {

                activo: true,
                userId

            },

            include: {

                contact: {

                    select: {

                        id: true,
                        nombre: true,
                        apellido: true,
                        correo: true,
                        telefono: true,
                        puesto: true,

                        company: {

                            select: {

                                id: true,
                                nombre: true,
                                razonSocial: true

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
                        activo: true,

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
     * Obtiene un lead por ID.
     *
     * @param {number} id
     */
    async obtenerPorId(id) {

        return await prisma.lead.findUnique({

            where: {
                id
            },

            include: {

                contact: {

                    select: {

                        id: true,
                        nombre: true,
                        apellido: true,
                        correo: true,
                        telefono: true,
                        puesto: true,

                        company: {

                            select: {

                                id: true,
                                nombre: true,
                                razonSocial: true

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
                        activo: true,

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
     * Crea un nuevo Lead.
     *
     * @param {Object} datos
     */
    async crear(datos) {

        return await prisma.lead.create({

            data: datos

        });

    }

    /**
     * Actualiza un Lead.
     *
     * @param {number} id
     * @param {Object} datos
     */
    async actualizar(id, datos) {

        return await prisma.lead.update({

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

        return await prisma.lead.update({

            where: {
                id
            },

            data: {
                activo: false
            }

        });

    }

}

module.exports = new LeadRepository();