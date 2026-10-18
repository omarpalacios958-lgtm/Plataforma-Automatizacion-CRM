const automationRepository = require("../repositories/automation.repository");
const notificationService = require("../../notifications/services/notification.service");
const taskService = require("../../tasks/services/task.service");
const emailService = require("./email.service");

const EVENTOS_PERMITIDOS = [
    "LEAD_CREADO",
    "SEGUIMIENTO_VENCIDO"
];

class AutomationExecutionService {
    async procesarEvento(datos) {
        this.validarEvento(datos);

        const { evento, leadId, userId } = datos;

        const fechaEvento = datos.fechaEvento
            ? new Date(datos.fechaEvento)
            : new Date();

        const automatizaciones =
            await automationRepository.obtenerActivasPorEvento(evento);

        const resultados = [];

        for (const automatizacion of automatizaciones) {
            const claveEvento = this.generarClaveEvento({
                evento,
                leadId,
                fechaEvento
            });

            if (automatizacion.acciones.length === 0) {
                resultados.push({
                    automationId: automatizacion.id,
                    estado: "Omitida",
                    mensaje: "La automatización no tiene acciones activas."
                });

                continue;
            }

            let ejecucion;

            try {
                ejecucion = await automationRepository.crearEjecucion({
                    claveEvento,
                    estado: "Pendiente",
                    resultado: JSON.stringify({ acciones: [] }),
                    fechaEvento,
                    automationId: automatizacion.id,
                    leadId,
                    userId
                });
            } catch (error) {
                if (error.code === "P2002") {
                    resultados.push({
                        automationId: automatizacion.id,
                        estado: "Omitida",
                        mensaje: "El evento ya fue registrado."
                    });

                    continue;
                }

                throw error;
            }

            const resultadoAcciones = [];
            let estadoFinal = "Completada";
            let mensajeError = null;

            for (const accion of automatizacion.acciones) {
                let resultado;

                // Primero ejecutamos la acción.
                try {
                    resultado = await this.ejecutarAccion(
                        accion,
                        { userId, leadId, evento }
                    );
                } catch (error) {
                    estadoFinal = "Fallida";
                    mensajeError =
                        `Falló la acción ${accion.id} ` +
                        `(${accion.tipo}): ${error.message}`;

                    resultadoAcciones.push({
                        accionId: accion.id,
                        tipo: accion.tipo,
                        estado: "Fallida",
                        error: error.message
                    });

                    // No ejecutar las acciones posteriores.
                    break;
                }

                resultadoAcciones.push({
                    accionId: accion.id,
                    tipo: accion.tipo,
                    estado: "Completada",
                    resultado
                });

                // Después intentamos guardar el resultado.
                try {
                    await automationRepository.actualizarEjecucion(
                        ejecucion.id,
                        {
                            resultado: JSON.stringify({
                                acciones: resultadoAcciones
                            })
                        }
                    );
                } catch (error) {
                    estadoFinal = "Fallida";
                    mensajeError =
                        `La acción ${accion.id} (${accion.tipo}) ` +
                        "se ejecutó, pero no se pudo guardar su resultado " +
                        `en el historial: ${error.message}`;

                    // No repetir la acción ni continuar con las siguientes.
                    break;
                }
            }

            // Intentamos guardar el estado final y el historial disponible.
            try {
                await automationRepository.actualizarEjecucion(
                    ejecucion.id,
                    {
                        estado: estadoFinal,
                        resultado: JSON.stringify({
                            acciones: resultadoAcciones
                        }),
                        mensajeError,
                        fechaEjecucion: new Date()
                    }
                );
            } catch (error) {
                // No afirmar que el estado final quedó guardado.
                throw new Error(
                    `No se pudo guardar el estado final de la ejecución ` +
                    `${ejecucion.id}. El registro puede continuar como ` +
                    `Pendiente y alguna acción puede haberse ejecutado. ` +
                    `No se reintentaron automáticamente las acciones. ` +
                    `Error de persistencia: ${error.message}`
                );
            }

            resultados.push({
                automationId: automatizacion.id,
                ejecucionId: ejecucion.id,
                estado: estadoFinal,
                mensajeError
            });
        }

        return {
            evento,
            leadId,
            total: resultados.length,
            resultados
        };
    }

    validarEvento(datos) {
        if (!datos || typeof datos !== "object") {
            throw new Error("Los datos del evento no son válidos.");
        }

        if (!EVENTOS_PERMITIDOS.includes(datos.evento)) {
            throw new Error("El evento de automatización no es válido.");
        }

        if (!Number.isInteger(datos.leadId) || datos.leadId <= 0) {
            throw new Error("El identificador del prospecto no es válido.");
        }

        if (!Number.isInteger(datos.userId) || datos.userId <= 0) {
            throw new Error("El identificador del usuario no es válido.");
        }

        if (
            datos.fechaEvento !== undefined &&
            Number.isNaN(new Date(datos.fechaEvento).getTime())
        ) {
            throw new Error("La fecha del evento no es válida.");
        }
    }

    async ejecutarAccion(accion, contexto) {
        switch (accion.tipo) {
            case "CREAR_NOTIFICACION": {
                const { titulo, mensaje, tipo } = accion.configuracion;

                const notificacion = await notificationService.crear(
                    { titulo, mensaje, tipo },
                    { id: contexto.userId }
                );

                return {
                    notificationId: notificacion.id
                };
            }

            case "CREAR_TAREA": {
                const {
                    titulo,
                    descripcion,
                    prioridad,
                    estado,
                    fechaLimite
                } = accion.configuracion;

                const tarea = await taskService.crear(
                    {
                        titulo,
                        descripcion,
                        prioridad,
                        estado,
                        fechaLimite
                    },
                    { id: contexto.userId }
                );

                return {
                    taskId: tarea.id
                };
            }

            case "ENVIAR_CORREO": {
                const {
                    destinatario,
                    asunto,
                    mensaje
                } = accion.configuracion;

                const resultadoCorreo = await emailService.enviar({
                    destinatario,
                    asunto,
                    mensaje
                });

                if (
                    resultadoCorreo.rechazados &&
                    resultadoCorreo.rechazados.length > 0
                ) {
                    throw new Error(
                        "El servidor SMTP rechazó al destinatario."
                    );
                }

                return {
                    messageId: resultadoCorreo.messageId,
                    aceptados: resultadoCorreo.aceptados
                };
            }

            default:
                throw new Error(
                    `Tipo de acción no soportado: ${accion.tipo}.`
                );
        }
    }

    generarClaveEvento({ evento, leadId, fechaEvento }) {
        switch (evento) {
            case "LEAD_CREADO":
                return `lead:${leadId}:created`;

            case "SEGUIMIENTO_VENCIDO":
                return (
                    `lead:${leadId}:followup:` +
                    fechaEvento.toISOString()
                );

            default:
                throw new Error(
                    "No se puede generar la clave del evento."
                );
        }
    }
}

module.exports = new AutomationExecutionService();