
const { test } = require("node:test");
const assert = require("node:assert/strict");

const automationController = require(
    "../src/modules/automations/controllers/automation.controller"
);

const automationService = require(
    "../src/modules/automations/services/automation.service"
);

const administrador = { id: 1, role: "Administrador" };

function crearRespuestaSimulada() {
    return {
        statusCode: null,
        body: null,

        status(codigo) {
            this.statusCode = codigo;
            return this;
        },

        json(datos) {
            this.body = datos;
            return this;
        },
    };
}

function simularMetodo(objeto, nombre, implementacion) {
    const original = objeto[nombre];
    objeto[nombre] = implementacion;

    return () => {
        objeto[nombre] = original;
    };
}

test("obtenerTodos responde 200 cuando el servicio funciona", async () => {
    const datos = [{ id: 1, nombre: "Automatización de prueba" }];
    const restaurar = simularMetodo(
        automationService,
        "obtenerTodos",
        async () => datos
    );
    const res = crearRespuestaSimulada();

    try {
        await automationController.obtenerTodos(
            { user: administrador },
            res
        );

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { success: true, data: datos });
    } finally {
        restaurar();
    }
});

test("obtenerTodos responde 500 ante un error inesperado", async () => {
    const restaurar = simularMetodo(
        automationService,
        "obtenerTodos",
        async () => {
            throw new Error("Error de base de datos");
        }
    );
    const res = crearRespuestaSimulada();

    try {
        await automationController.obtenerTodos(
            { user: administrador },
            res
        );

        assert.equal(res.statusCode, 500);
        assert.equal(res.body.message, "Error interno del servidor.");
    } finally {
        restaurar();
    }
});

test("obtenerPorId responde 200 cuando encuentra la automatización", async () => {
    const dato = { id: 5, nombre: "Automatización de prueba" };
    const restaurar = simularMetodo(
        automationService,
        "obtenerPorId",
        async (id) => {
            assert.equal(id, 5);
            return dato;
        }
    );
    const res = crearRespuestaSimulada();

    try {
        await automationController.obtenerPorId(
            { params: { id: "5" }, user: administrador },
            res
        );

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { success: true, data: dato });
    } finally {
        restaurar();
    }
});

test("obtenerPorId responde 404 cuando la automatización no existe", async () => {
    const restaurar = simularMetodo(
        automationService,
        "obtenerPorId",
        async () => {
            throw new Error("Automatización no encontrada.");
        }
    );
    const res = crearRespuestaSimulada();

    try {
        await automationController.obtenerPorId(
            { params: { id: "999" }, user: administrador },
            res
        );

        assert.equal(res.statusCode, 404);
        assert.equal(
            res.body.message,
            "Automatización no encontrada."
        );
    } finally {
        restaurar();
    }
});

test("obtenerPorId responde 400 cuando el ID no es válido", async () => {
    const restaurar = simularMetodo(
        automationService,
        "obtenerPorId",
        async () => {
            throw new Error("El ID de la automatización no es válido.");
        }
    );
    const res = crearRespuestaSimulada();

    try {
        await automationController.obtenerPorId(
            { params: { id: "abc" }, user: administrador },
            res
        );

        assert.equal(res.statusCode, 400);
        assert.equal(
            res.body.message,
            "El ID de la automatización no es válido."
        );
    } finally {
        restaurar();
    }
});

test("obtenerPorId responde 500 ante un error inesperado", async () => {
    const restaurar = simularMetodo(
        automationService,
        "obtenerPorId",
        async () => {
            throw new Error("Error de conexión a la base de datos");
        }
    );
    const res = crearRespuestaSimulada();

    try {
        await automationController.obtenerPorId(
            { params: { id: "5" }, user: administrador },
            res
        );

        assert.equal(res.statusCode, 500);
        assert.equal(res.body.message, "Error interno del servidor.");
    } finally {
        restaurar();
    }
});
