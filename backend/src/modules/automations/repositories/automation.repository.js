
const prisma = require("../../../config/database");

class AutomationRepository {
    async obtenerTodos() {
        return prisma.automation.findMany({
            include: {
                acciones: {
                    orderBy: { orden: "asc" }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    async obtenerPorId(id) {
        return prisma.automation.findUnique({
            where: { id },
            include: {
                acciones: {
                    orderBy: { orden: "asc" }
                }
            }
        });
    }

    async crear(datos) {
        const { acciones = [], ...datosAutomation } = datos;

        return prisma.automation.create({
            data: {
                ...datosAutomation,
                acciones: {
                    create: acciones.map((accion, index) => ({
                        tipo: accion.tipo,
                        configuracion: accion.configuracion,
                        orden: accion.orden ?? index + 1,
                        activa: accion.activa ?? true,
                        userId: datosAutomation.userId
                    }))
                }
            },
            include: {
                acciones: {
                    orderBy: { orden: "asc" }
                }
            }
        });
    }

    async actualizar(id, datos) {
        const { acciones, ...datosAutomation } = datos;

        return prisma.$transaction(async (tx) => {
            let usuarioIdAcciones;

            if (acciones !== undefined) {
                const automatizacion = await tx.automation.findUnique({
                    where: { id },
                    select: { userId: true }
                });

                // Si no existe, dejamos que Prisma produzca
                // el error correspondiente al intentar actualizarla.
                if (!automatizacion) {
                    return tx.automation.update({
                        where: { id },
                        data: datosAutomation
                    });
                }

                usuarioIdAcciones = automatizacion.userId;

                await tx.automationAction.deleteMany({
                    where: { automationId: id }
                });
            }

            return tx.automation.update({
                where: { id },
                data: {
                    ...datosAutomation,
                    ...(acciones !== undefined && {
                        acciones: {
                            create: acciones.map((accion, index) => ({
                                tipo: accion.tipo,
                                configuracion: accion.configuracion,
                                orden: accion.orden ?? index + 1,
                                activa: accion.activa ?? true,
                                userId: usuarioIdAcciones
                            }))
                        }
                    })
                },
                include: {
                    acciones: {
                        orderBy: { orden: "asc" }
                    }
                }
            });
        });
    }

    async desactivar(id) {
        return prisma.automation.update({
            where: { id },
            data: { activa: false }
        });
    }

    async obtenerEjecuciones(automationId) {
        return prisma.automationExecution.findMany({
            where: { automationId },
            orderBy: { createdAt: "desc" }
        });
    }

    // Busca automatizaciones activas para un evento específico.
    async obtenerActivasPorEvento(evento) {
        return prisma.automation.findMany({
            where: {
                evento,
                activa: true
            },
            include: {
                acciones: {
                    where: { activa: true },
                    orderBy: { orden: "asc" }
                }
            },
            orderBy: { id: "asc" }
        });
    }

    // Registra una ejecución en la base de datos.
    async crearEjecucion(datos) {
        return prisma.automationExecution.create({
            data: datos
        });
    }

    // Busca una ejecución previa para evitar procesar
    // dos veces el mismo evento en una automatización.
    async obtenerEjecucionPorClave(automationId, claveEvento) {
        return prisma.automationExecution.findUnique({
            where: {
                automationId_claveEvento: {
                    automationId,
                    claveEvento
                }
            }
        });
    }

    // Actualiza el estado y el resultado de una ejecución.
    async actualizarEjecucion(id, datos) {
        return prisma.automationExecution.update({
            where: { id },
            data: datos
        });
    }
}

module.exports = new AutomationRepository();
