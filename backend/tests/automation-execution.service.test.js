const { test } = require("node:test");
const assert = require("node:assert/strict");

const automationExecutionService = require(
    "../src/modules/automations/services/automation-execution.service"
);

const automationRepository = require(
    "../src/modules/automations/repositories/automation.repository"
);

const emailService = require(
    "../src/modules/automations/services/email.service"
);

const taskService = require(
    "../src/modules/tasks/services/task.service"
);

test(
    "Una acción fallida detiene las acciones posteriores",
    async () => {
        const originales = {
            obtenerActivasPorEvento:
                automationRepository.obtenerActivasPorEvento,
            crearEjecucion:
                automationRepository.crearEjecucion,
            actualizarEjecucion:
                automationRepository.actualizarEjecucion,
            enviarCorreo:
                emailService.enviar,
            crearTarea:
                taskService.crear,
        };

        let llamadasCorreo = 0;
        let llamadasTarea = 0;
        const actualizaciones = [];

        try {
            automationRepository.obtenerActivasPorEvento =
                async () => [
                    {
                        id: 14,
                        acciones: [
                            {
                                id: 101,
                                tipo: "ENVIAR_CORREO",
                                configuracion: {
                                    destinatario: "prueba@example.com",
                                    asunto: "Prueba controlada",
                                    mensaje: "Mensaje de prueba",
                                },
                            },
                            {
                                id: 102,
                                tipo: "CREAR_TAREA",
                                configuracion: {
                                    titulo: "Esta tarea no debe crearse",
                                    descripcion: "Prueba automatizada",
                                    prioridad: "Media",
                                    estado: "Pendiente",
                                },
                            },
                        ],
                    },
                ];

            automationRepository.crearEjecucion =
                async (datos) => ({
                    id: 9001,
                    ...datos,
                });

            automationRepository.actualizarEjecucion =
                async (id, datos) => {
                    actualizaciones.push({ id, ...datos });
                };

            emailService.enviar = async () => {
                llamadasCorreo += 1;
                throw new Error("Fallo controlado de prueba.");
            };

            taskService.crear = async () => {
                llamadasTarea += 1;
                throw new Error(
                    "La tarea no debería llegar a ejecutarse."
                );
            };

            const resultado =
                await automationExecutionService.procesarEvento({
                    evento: "LEAD_CREADO",
                    leadId: 999,
                    userId: 1,
                });

            assert.equal(llamadasCorreo, 1);
            assert.equal(llamadasTarea, 0);

            assert.equal(resultado.total, 1);
            assert.equal(
                resultado.resultados[0].estado,
                "Fallida"
            );

            const actualizacionFinal =
                actualizaciones.find(
                    (actualizacion) =>
                        actualizacion.estado === "Fallida"
                );

            assert.ok(
                actualizacionFinal,
                "Debe guardarse el estado Fallida."
            );

            const historial = JSON.parse(
                actualizacionFinal.resultado
            );

            assert.equal(historial.acciones.length, 1);
            assert.equal(
                historial.acciones[0].tipo,
                "ENVIAR_CORREO"
            );
            assert.equal(
                historial.acciones[0].estado,
                "Fallida"
            );
            assert.equal(
                historial.acciones[0].error,
                "Fallo controlado de prueba."
            );

            assert.equal(
                actualizacionFinal.mensajeError.includes(
                    "Fallo controlado de prueba."
                ),
                true
            );
        } finally {
            automationRepository.obtenerActivasPorEvento =
                originales.obtenerActivasPorEvento;

            automationRepository.crearEjecucion =
                originales.crearEjecucion;

            automationRepository.actualizarEjecucion =
                originales.actualizarEjecucion;

            emailService.enviar = originales.enviarCorreo;
            taskService.crear = originales.crearTarea;
        }
    }
);

test(
    "Un evento duplicado se omite sin ejecutar acciones",
    async () => {
        const originales = {
            obtenerActivasPorEvento:
                automationRepository.obtenerActivasPorEvento,
            crearEjecucion:
                automationRepository.crearEjecucion,
            actualizarEjecucion:
                automationRepository.actualizarEjecucion,
            enviarCorreo:
                emailService.enviar,
            crearTarea:
                taskService.crear,
        };

        let intentosDeCrearEjecucion = 0;
        let llamadasTarea = 0;
        let llamadasCorreo = 0;

        try {
            automationRepository.obtenerActivasPorEvento =
                async () => [
                    {
                        id: 14,
                        acciones: [
                            {
                                id: 201,
                                tipo: "CREAR_TAREA",
                                configuracion: {
                                    titulo: "Tarea de prueba",
                                    descripcion: "Prueba de idempotencia",
                                    prioridad: "Media",
                                    estado: "Pendiente",
                                },
                            },
                        ],
                    },
                ];

            automationRepository.crearEjecucion =
                async () => {
                    intentosDeCrearEjecucion += 1;

                    const error = new Error(
                        "Clave de evento duplicada"
                    );
                    error.code = "P2002";
                    throw error;
                };

            automationRepository.actualizarEjecucion =
                async () => {
                    throw new Error(
                        "No debería actualizarse ninguna ejecución."
                    );
                };

            taskService.crear = async () => {
                llamadasTarea += 1;
                return { id: 9999 };
            };

            emailService.enviar = async () => {
                llamadasCorreo += 1;
                return {};
            };

            const resultado =
                await automationExecutionService.procesarEvento({
                    evento: "LEAD_CREADO",
                    leadId: 999,
                    userId: 1,
                });

            assert.equal(intentosDeCrearEjecucion, 1);
            assert.equal(llamadasTarea, 0);
            assert.equal(llamadasCorreo, 0);

            assert.equal(resultado.total, 1);
            assert.equal(
                resultado.resultados[0].estado,
                "Omitida"
            );
            assert.equal(
                resultado.resultados[0].mensaje,
                "El evento ya fue registrado."
            );
        } finally {
            automationRepository.obtenerActivasPorEvento =
                originales.obtenerActivasPorEvento;

            automationRepository.crearEjecucion =
                originales.crearEjecucion;

            automationRepository.actualizarEjecucion =
                originales.actualizarEjecucion;

            emailService.enviar = originales.enviarCorreo;
            taskService.crear = originales.crearTarea;
        }
    }
);

test(
    "Un fallo al guardar el historial detiene las acciones sin repetirlas",
    async () => {
        const originales = {
            obtenerActivasPorEvento:
                automationRepository.obtenerActivasPorEvento,
            crearEjecucion:
                automationRepository.crearEjecucion,
            actualizarEjecucion:
                automationRepository.actualizarEjecucion,
            crearTarea: taskService.crear,
            enviarCorreo: emailService.enviar,
        };

        let llamadasTarea = 0;
        let llamadasCorreo = 0;
        let llamadasActualizacion = 0;
        const actualizaciones = [];

        try {
            automationRepository.obtenerActivasPorEvento =
                async () => [
                    {
                        id: 14,
                        acciones: [
                            {
                                id: 301,
                                tipo: "CREAR_TAREA",
                                configuracion: {
                                    titulo: "Tarea simulada",
                                    descripcion:
                                        "Prueba de persistencia",
                                    prioridad: "Media",
                                    estado: "Pendiente",
                                },
                            },
                            {
                                id: 302,
                                tipo: "ENVIAR_CORREO",
                                configuracion: {
                                    destinatario:
                                        "prueba@example.com",
                                    asunto: "No debe enviarse",
                                    mensaje: "Prueba controlada",
                                },
                            },
                        ],
                    },
                ];

            automationRepository.crearEjecucion =
                async (datos) => ({
                    id: 9002,
                    ...datos,
                });

            automationRepository.actualizarEjecucion =
                async (id, datos) => {
                    llamadasActualizacion += 1;
                    actualizaciones.push({ id, ...datos });

                    // Primera actualización: guardar el historial
                    // de la tarea ejecutada. Simulamos un fallo.
                    if (llamadasActualizacion === 1) {
                        throw new Error(
                            "Fallo controlado de persistencia."
                        );
                    }
                };

            taskService.crear = async () => {
                llamadasTarea += 1;
                return { id: 9003 };
            };

            emailService.enviar = async () => {
                llamadasCorreo += 1;
                return {
                    messageId: "simulado",
                    aceptados: ["prueba@example.com"],
                    rechazados: [],
                };
            };

            const resultado =
                await automationExecutionService.procesarEvento({
                    evento: "LEAD_CREADO",
                    leadId: 999,
                    userId: 1,
                });

            assert.equal(llamadasTarea, 1);
            assert.equal(llamadasCorreo, 0);

            assert.equal(resultado.total, 1);
            assert.equal(
                resultado.resultados[0].estado,
                "Fallida"
            );

            assert.equal(llamadasActualizacion, 2);

            const actualizacionFinal = actualizaciones[1];

            assert.equal(
                actualizacionFinal.estado,
                "Fallida"
            );

            assert.match(
                actualizacionFinal.mensajeError,
                /se ejecutó, pero no se pudo guardar su resultado/
            );

            assert.match(
                actualizacionFinal.mensajeError,
                /Fallo controlado de persistencia/
            );

            const historial = JSON.parse(
                actualizacionFinal.resultado
            );

            assert.equal(historial.acciones.length, 1);
            assert.equal(
                historial.acciones[0].tipo,
                "CREAR_TAREA"
            );
            assert.equal(
                historial.acciones[0].estado,
                "Completada"
            );
        } finally {
            automationRepository.obtenerActivasPorEvento =
                originales.obtenerActivasPorEvento;

            automationRepository.crearEjecucion =
                originales.crearEjecucion;

            automationRepository.actualizarEjecucion =
                originales.actualizarEjecucion;

            taskService.crear = originales.crearTarea;
            emailService.enviar = originales.enviarCorreo;
        }
    }
);

test(
    "Un fallo al guardar el estado final informa del posible estado pendiente",
    async () => {
        const originales = {
            obtenerActivasPorEvento:
                automationRepository.obtenerActivasPorEvento,
            crearEjecucion:
                automationRepository.crearEjecucion,
            actualizarEjecucion:
                automationRepository.actualizarEjecucion,
            crearTarea: taskService.crear,
            enviarCorreo: emailService.enviar,
        };

        let llamadasTarea = 0;
        let llamadasCorreo = 0;
        let llamadasActualizacion = 0;

        try {
            // Una sola acción: la primera actualización guarda su
            // resultado y la segunda es el guardado del estado final.
            automationRepository.obtenerActivasPorEvento =
                async () => [
                    {
                        id: 14,
                        acciones: [
                            {
                                id: 401,
                                tipo: "CREAR_TAREA",
                                configuracion: {
                                    titulo: "Tarea simulada",
                                    descripcion:
                                        "Prueba de estado final",
                                    prioridad: "Media",
                                    estado: "Pendiente",
                                },
                            },
                        ],
                    },
                ];

            automationRepository.crearEjecucion =
                async (datos) => ({
                    id: 9004,
                    ...datos,
                });

            automationRepository.actualizarEjecucion =
                async () => {
                    llamadasActualizacion += 1;

                    if (llamadasActualizacion === 2) {
                        throw new Error(
                            "Fallo controlado del estado final."
                        );
                    }
                };

            taskService.crear = async () => {
                llamadasTarea += 1;
                return { id: 9005 };
            };

            emailService.enviar = async () => {
                llamadasCorreo += 1;
                return {
                    messageId: "simulado",
                    aceptados: ["prueba@example.com"],
                    rechazados: [],
                };
            };

            await assert.rejects(
                automationExecutionService.procesarEvento({
                    evento: "LEAD_CREADO",
                    leadId: 999,
                    userId: 1,
                }),
                (error) => {
                    assert.match(
                        error.message,
                        /No se pudo guardar el estado final/
                    );
                    assert.match(
                        error.message,
                        /puede continuar como Pendiente/
                    );
                    assert.match(
                        error.message,
                        /No se reintentaron automáticamente las acciones/
                    );
                    assert.match(
                        error.message,
                        /Fallo controlado del estado final/
                    );

                    return true;
                }
            );

            assert.equal(llamadasTarea, 1);
            assert.equal(llamadasCorreo, 0);
            assert.equal(llamadasActualizacion, 2);
        } finally {
            automationRepository.obtenerActivasPorEvento =
                originales.obtenerActivasPorEvento;
            automationRepository.crearEjecucion =
                originales.crearEjecucion;
            automationRepository.actualizarEjecucion =
                originales.actualizarEjecucion;
            taskService.crear = originales.crearTarea;
            emailService.enviar = originales.enviarCorreo;
        }
    }
);

test(
    "Falla el correo cuando SMTP no confirma destinatarios aceptados",
    async () => {
        const originales = {
            obtenerActivasPorEvento:
                automationRepository.obtenerActivasPorEvento,
            crearEjecucion:
                automationRepository.crearEjecucion,
            actualizarEjecucion:
                automationRepository.actualizarEjecucion,
            enviarCorreo: emailService.enviar,
        };

        const actualizaciones = [];

        try {
            automationRepository.obtenerActivasPorEvento =
                async () => [
                    {
                        id: 21,
                        acciones: [
                            {
                                id: 201,
                                tipo: "ENVIAR_CORREO",
                                configuracion: {
                                    destinatario: "prueba@example.com",
                                    asunto: "Prueba SMTP",
                                    mensaje: "Mensaje de prueba",
                                },
                            },
                        ],
                    },
                ];

            automationRepository.crearEjecucion =
                async (datos) => ({
                    id: 9101,
                    ...datos,
                });

            automationRepository.actualizarEjecucion =
                async (id, datos) => {
                    actualizaciones.push({ id, ...datos });
                };

            emailService.enviar = async () => ({
                messageId: "simulado",
                aceptados: [],
                rechazados: [],
            });

            const resultado =
                await automationExecutionService.procesarEvento({
                    evento: "LEAD_CREADO",
                    leadId: 999,
                    userId: 1,
                });

            assert.equal(resultado.total, 1);
            assert.equal(
                resultado.resultados[0].estado,
                "Fallida"
            );

            const actualizacionFinal =
                actualizaciones.find(
                    (actualizacion) =>
                        actualizacion.estado === "Fallida"
                );

            assert.ok(actualizacionFinal);

            const historial = JSON.parse(
                actualizacionFinal.resultado
            );

            assert.equal(
                historial.acciones[0].estado,
                "Fallida"
            );

            assert.equal(
                historial.acciones[0].error,
                "El servidor SMTP no confirmó ningún destinatario aceptado."
            );
        } finally {
            automationRepository.obtenerActivasPorEvento =
                originales.obtenerActivasPorEvento;
            automationRepository.crearEjecucion =
                originales.crearEjecucion;
            automationRepository.actualizarEjecucion =
                originales.actualizarEjecucion;
            emailService.enviar = originales.enviarCorreo;
        }
    }
);

test(
    "Falla el correo cuando SMTP informa destinatarios rechazados",
    async () => {
        const originales = {
            obtenerActivasPorEvento:
                automationRepository.obtenerActivasPorEvento,
            crearEjecucion:
                automationRepository.crearEjecucion,
            actualizarEjecucion:
                automationRepository.actualizarEjecucion,
            enviarCorreo: emailService.enviar,
        };

        const actualizaciones = [];

        try {
            automationRepository.obtenerActivasPorEvento =
                async () => [
                    {
                        id: 22,
                        acciones: [
                            {
                                id: 202,
                                tipo: "ENVIAR_CORREO",
                                configuracion: {
                                    destinatario: "prueba@example.com",
                                    asunto: "Prueba SMTP",
                                    mensaje: "Mensaje de prueba",
                                },
                            },
                        ],
                    },
                ];

            automationRepository.crearEjecucion =
                async (datos) => ({
                    id: 9102,
                    ...datos,
                });

            automationRepository.actualizarEjecucion =
                async (id, datos) => {
                    actualizaciones.push({ id, ...datos });
                };

            emailService.enviar = async () => ({
                messageId: "simulado",
                aceptados: ["otro@example.com"],
                rechazados: ["prueba@example.com"],
            });

            const resultado =
                await automationExecutionService.procesarEvento({
                    evento: "LEAD_CREADO",
                    leadId: 999,
                    userId: 1,
                });

            assert.equal(resultado.total, 1);
            assert.equal(
                resultado.resultados[0].estado,
                "Fallida"
            );

            const actualizacionFinal =
                actualizaciones.find(
                    (actualizacion) =>
                        actualizacion.estado === "Fallida"
                );

            assert.ok(actualizacionFinal);

            const historial = JSON.parse(
                actualizacionFinal.resultado
            );

            assert.equal(
                historial.acciones[0].estado,
                "Fallida"
            );

            assert.equal(
                historial.acciones[0].error,
                "El servidor SMTP rechazó al destinatario."
            );
        } finally {
            automationRepository.obtenerActivasPorEvento =
                originales.obtenerActivasPorEvento;
            automationRepository.crearEjecucion =
                originales.crearEjecucion;
            automationRepository.actualizarEjecucion =
                originales.actualizarEjecucion;
            emailService.enviar = originales.enviarCorreo;
        }
    }
);

test(
    "Completa el correo cuando SMTP confirma un destinatario aceptado",
    async () => {
        const originales = {
            obtenerActivasPorEvento:
                automationRepository.obtenerActivasPorEvento,
            crearEjecucion:
                automationRepository.crearEjecucion,
            actualizarEjecucion:
                automationRepository.actualizarEjecucion,
            enviarCorreo: emailService.enviar,
        };

        const actualizaciones = [];

        try {
            automationRepository.obtenerActivasPorEvento =
                async () => [
                    {
                        id: 23,
                        acciones: [
                            {
                                id: 203,
                                tipo: "ENVIAR_CORREO",
                                configuracion: {
                                    destinatario: "prueba@example.com",
                                    asunto: "Prueba SMTP",
                                    mensaje: "Mensaje de prueba",
                                },
                            },
                        ],
                    },
                ];

            automationRepository.crearEjecucion =
                async (datos) => ({
                    id: 9103,
                    ...datos,
                });

            automationRepository.actualizarEjecucion =
                async (id, datos) => {
                    actualizaciones.push({ id, ...datos });
                };

            emailService.enviar = async () => ({
                messageId: "simulado",
                aceptados: ["prueba@example.com"],
                rechazados: [],
            });

            const resultado =
                await automationExecutionService.procesarEvento({
                    evento: "LEAD_CREADO",
                    leadId: 999,
                    userId: 1,
                });

            assert.equal(resultado.total, 1);
            assert.equal(
                resultado.resultados[0].estado,
                "Completada"
            );

            const actualizacionFinal =
                actualizaciones.find(
                    (actualizacion) =>
                        actualizacion.estado === "Completada"
                );

            assert.ok(actualizacionFinal);

            const historial = JSON.parse(
                actualizacionFinal.resultado
            );

            assert.equal(
                historial.acciones[0].estado,
                "Completada"
            );

            assert.equal(
                historial.acciones[0].resultado.messageId,
                "simulado"
            );

            assert.deepEqual(
                historial.acciones[0].resultado.aceptados,
                ["prueba@example.com"]
            );
        } finally {
            automationRepository.obtenerActivasPorEvento =
                originales.obtenerActivasPorEvento;
            automationRepository.crearEjecucion =
                originales.crearEjecucion;
            automationRepository.actualizarEjecucion =
                originales.actualizarEjecucion;
            emailService.enviar = originales.enviarCorreo;
        }
    }
);
