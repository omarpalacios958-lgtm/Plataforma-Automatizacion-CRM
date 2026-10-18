
const { test } = require("node:test");
const assert = require("node:assert/strict");

const automationService = require(
    "../src/modules/automations/services/automation.service"
);

const automationRepository = require(
    "../src/modules/automations/repositories/automation.repository"
);

const automationValidation = require(
    "../src/modules/automations/validations/automation.validation"
);

const administrador = { id: 1, role: "Administrador" };
const vendedor = { id: 2, role: "Vendedor" };

const automatizacionValida = () => ({
    nombre: "Automatización de prueba",
    descripcion: "Descripción de prueba",
    evento: "LEAD_CREADO",
    activa: false,
    acciones: [
        {
            tipo: "CREAR_TAREA",
            configuracion: {
                titulo: "Contactar al prospecto",
                prioridad: "Media",
                estado: "Pendiente",
            },
        },
    ],
});

const automatizacionExistente = (sobrescrituras = {}) => ({
    id: 10,
    nombre: "Automatización existente",
    descripcion: null,
    evento: "LEAD_CREADO",
    activa: true,
    acciones: [],
    ...sobrescrituras,
});

function simularMetodos(objeto, sustituciones) {
    const originales = {};

    for (const [nombre, implementacion] of Object.entries(
        sustituciones
    )) {
        originales[nombre] = objeto[nombre];
        objeto[nombre] = implementacion;
    }

    return () => {
        for (const [nombre, implementacion] of Object.entries(
            originales
        )) {
            objeto[nombre] = implementacion;
        }
    };
}

test("Rechaza usuarios que no son administradores", async () => {
    await assert.rejects(
        automationService.obtenerTodos(vendedor),
        /permisos para administrar automatizaciones/i
    );

    await assert.rejects(
        automationService.obtenerTodos(null),
        /permisos para administrar automatizaciones/i
    );
});

test("Obtiene todas las automatizaciones para un administrador", async () => {
    const esperadas = [automatizacionExistente()];
    let llamadas = 0;

    const restaurar = simularMetodos(automationRepository, {
        obtenerTodos: async () => {
            llamadas += 1;
            return esperadas;
        },
    });

    try {
        const resultado =
            await automationService.obtenerTodos(administrador);

        assert.deepEqual(resultado, esperadas);
        assert.equal(llamadas, 1);
    } finally {
        restaurar();
    }
});

test("Rechaza un ID inválido al consultar una automatización", async () => {
    for (const id of [0, -1, 1.5, NaN]) {
        await assert.rejects(
            automationService.obtenerPorId(id, administrador),
            /ID de la automatización no es válido/i
        );
    }
});

test("Rechaza una automatización inexistente", async () => {
    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => null,
    });

    try {
        await assert.rejects(
            automationService.obtenerPorId(999, administrador),
            /Automatización no encontrada/i
        );
    } finally {
        restaurar();
    }
});

test("Obtiene una automatización existente", async () => {
    const esperada = automatizacionExistente();
    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => esperada,
    });

    try {
        const resultado =
            await automationService.obtenerPorId(10, administrador);

        assert.deepEqual(resultado, esperada);
    } finally {
        restaurar();
    }
});

test("Crea una automatización inactiva por defecto", async () => {
    let datosRecibidos;

    const restaurar = simularMetodos(automationRepository, {
        crear: async (datos) => {
            datosRecibidos = datos;
            return { id: 20, ...datos };
        },
    });

    try {
        const datos = automatizacionValida();
        delete datos.activa;

        await automationService.crear(datos, administrador);

        assert.equal(datosRecibidos.nombre, datos.nombre);
        assert.equal(datosRecibidos.descripcion, datos.descripcion);
        assert.equal(datosRecibidos.evento, "LEAD_CREADO");
        assert.equal(datosRecibidos.activa, false);
        assert.equal(datosRecibidos.userId, administrador.id);
        assert.deepEqual(datosRecibidos.acciones, datos.acciones);
    } finally {
        restaurar();
    }
});

test("Normaliza nombre y descripción al crear", async () => {
    let datosRecibidos;

    const restaurar = simularMetodos(automationRepository, {
        crear: async (datos) => {
            datosRecibidos = datos;
            return { id: 21, ...datos };
        },
    });

    try {
        const datos = automatizacionValida();
        datos.nombre = "  Automatización limpia  ";
        datos.descripcion = "  Descripción limpia  ";

        await automationService.crear(datos, administrador);

        assert.equal(datosRecibidos.nombre, "Automatización limpia");
        assert.equal(datosRecibidos.descripcion, "Descripción limpia");
    } finally {
        restaurar();
    }
});

test("Rechaza la creación de una automatización inválida", async () => {
    let llamadasRepositorio = 0;

    const restaurar = simularMetodos(automationRepository, {
        crear: async () => {
            llamadasRepositorio += 1;
        },
    });

    try {
        await assert.rejects(
            automationService.crear(
                { nombre: "", evento: "LEAD_CREADO" },
                administrador
            ),
            /nombre.*obligatorio/i
        );

        assert.equal(llamadasRepositorio, 0);
    } finally {
        restaurar();
    }
});

test("Actualiza únicamente los campos proporcionados", async () => {
    const existente = automatizacionExistente();
    let datosActualizacion;

    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => existente,
        actualizar: async (id, datos) => {
            datosActualizacion = { id, ...datos };
            return { ...existente, ...datos };
        },
    });

    try {
        await automationService.actualizar(
            10,
            { descripcion: "Descripción nueva" },
            administrador
        );

        assert.deepEqual(datosActualizacion, {
            id: 10,
            descripcion: "Descripción nueva",
        });
    } finally {
        restaurar();
    }
});

test("Rechaza una actualización sin campos válidos", async () => {
    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => automatizacionExistente(),
        actualizar: async () => {
            assert.fail("No debe actualizarse el repositorio");
        },
    });

    try {
        await assert.rejects(
            automationService.actualizar(10, {}, administrador),
            /al menos un campo para actualizar/i
        );
    } finally {
        restaurar();
    }
});

test("Impide modificar acciones cuando existe historial", async () => {
    let llamadasActualizar = 0;

    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => automatizacionExistente(),
        obtenerEjecuciones: async () => [{ id: 50 }],
        actualizar: async () => {
            llamadasActualizar += 1;
        },
    });

    try {
        await assert.rejects(
            automationService.actualizar(
                10,
                { acciones: automatizacionValida().acciones },
                administrador
            ),
            /no se pueden modificar las acciones.*historial/i
        );

        assert.equal(llamadasActualizar, 0);
    } finally {
        restaurar();
    }
});

test("Permite modificar acciones cuando no existe historial", async () => {
    const acciones = automatizacionValida().acciones;
    let datosActualizacion;

    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => automatizacionExistente(),
        obtenerEjecuciones: async () => [],
        actualizar: async (id, datos) => {
            datosActualizacion = { id, ...datos };
            return { id, ...datos };
        },
    });

    try {
        await automationService.actualizar(
            10,
            { acciones },
            administrador
        );

        assert.deepEqual(datosActualizacion, {
            id: 10,
            acciones,
        });
    } finally {
        restaurar();
    }
});

test("Rechaza desactivar una automatización inexistente", async () => {
    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => null,
        desactivar: async () => {
            assert.fail("No debe desactivarse una automatización inexistente");
        },
    });

    try {
        await assert.rejects(
            automationService.desactivar(999, administrador),
            /Automatización no encontrada/i
        );
    } finally {
        restaurar();
    }
});

test("No vuelve a desactivar una automatización inactiva", async () => {
    let llamadasDesactivar = 0;
    const inactiva = automatizacionExistente({ activa: false });

    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => inactiva,
        desactivar: async () => {
            llamadasDesactivar += 1;
        },
    });

    try {
        const resultado =
            await automationService.desactivar(10, administrador);

        assert.deepEqual(resultado, inactiva);
        assert.equal(llamadasDesactivar, 0);
    } finally {
        restaurar();
    }
});

test("Desactiva una automatización activa", async () => {
    let llamadasDesactivar = 0;
    const inactiva = automatizacionExistente({ activa: false });

    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () =>
            automatizacionExistente({ activa: true }),
        desactivar: async (id) => {
            llamadasDesactivar += 1;
            assert.equal(id, 10);
            return inactiva;
        },
    });

    try {
        const resultado =
            await automationService.desactivar(10, administrador);

        assert.equal(resultado.activa, false);
        assert.equal(llamadasDesactivar, 1);
    } finally {
        restaurar();
    }
});

test("Obtiene las ejecuciones de una automatización existente", async () => {
    const ejecuciones = [{ id: 70, estado: "Completada" }];
    let idConsultado;

    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => automatizacionExistente(),
        obtenerEjecuciones: async (id) => {
            idConsultado = id;
            return ejecuciones;
        },
    });

    try {
        const resultado =
            await automationService.obtenerEjecuciones(10, administrador);

        assert.deepEqual(resultado, ejecuciones);
        assert.equal(idConsultado, 10);
    } finally {
        restaurar();
    }
});

test("Rechaza consultar ejecuciones de una automatización inexistente", async () => {
    const restaurar = simularMetodos(automationRepository, {
        obtenerPorId: async () => null,
        obtenerEjecuciones: async () => {
            assert.fail("No debe consultarse el historial");
        },
    });

    try {
        await assert.rejects(
            automationService.obtenerEjecuciones(999, administrador),
            /Automatización no encontrada/i
        );
    } finally {
        restaurar();
    }
});
