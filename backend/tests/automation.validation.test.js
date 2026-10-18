
const { test } = require("node:test");
const assert = require("node:assert/strict");

const automationValidation = require(
    "../src/modules/automations/validations/automation.validation",
);

const automatizacionValida = () => ({
    nombre: "Automatización de prueba",
    descripcion: "Prueba unitaria de validaciones",
    evento: "LEAD_CREADO",
    activa: false,
    acciones: [
        {
            tipo: "CREAR_TAREA",
            configuracion: {
                titulo: "Contactar al prospecto",
                descripcion: "Dar seguimiento al prospecto",
                prioridad: "Media",
                estado: "Pendiente",
            },
        },
    ],
});

test("Acepta una automatización válida con una tarea", () => {
    assert.equal(
        automationValidation.validarCrear(automatizacionValida()),
        true,
    );
});

test("Acepta una automatización con una notificación válida", () => {
    const datos = automatizacionValida();

    datos.acciones = [
        {
            tipo: "CREAR_NOTIFICACION",
            configuracion: {
                titulo: "Nuevo prospecto",
                mensaje: "Se registró un nuevo prospecto.",
                tipo: "Información",
            },
        },
    ];

    assert.equal(automationValidation.validarCrear(datos), true);
});

test("Acepta una automatización con un correo válido", () => {
    const datos = automatizacionValida();

    datos.acciones = [
        {
            tipo: "ENVIAR_CORREO",
            configuracion: {
                destinatario: "prueba@example.com",
                asunto: "Seguimiento comercial",
                mensaje: "Mensaje de prueba.",
            },
        },
    ];

    assert.equal(automationValidation.validarCrear(datos), true);
});

test("Rechaza un nombre vacío", () => {
    const datos = automatizacionValida();
    datos.nombre = "   ";

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /nombre.*obligatorio/i,
    );
});

test("Rechaza un nombre que supera los 150 caracteres", () => {
    const datos = automatizacionValida();
    datos.nombre = "A".repeat(151);

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /150 caracteres/,
    );
});

test("Rechaza un evento no permitido", () => {
    const datos = automatizacionValida();
    datos.evento = "USUARIO_ELIMINADO";

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /evento.*no es válido/i,
    );
});

test("Rechaza campos no permitidos en la automatización", () => {
    const datos = {
        ...automatizacionValida(),
        userId: 999,
    };

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /Campos no permitidos.*userId/,
    );
});

test("Rechaza una lista de acciones vacía", () => {
    const datos = automatizacionValida();
    datos.acciones = [];

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /al menos una acción/,
    );
});

test("Rechaza una tarea sin título", () => {
    const datos = automatizacionValida();
    datos.acciones[0].configuracion.titulo = " ";

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /título de la tarea.*obligatorio/i,
    );
});

test("Rechaza un correo con formato inválido", () => {
    const datos = automatizacionValida();

    datos.acciones = [
        {
            tipo: "ENVIAR_CORREO",
            configuracion: {
                destinatario: "correo-invalido",
                asunto: "Prueba",
                mensaje: "Mensaje de prueba.",
            },
        },
    ];

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /destinatario.*correo electrónico válido/i,
    );
});

test("Rechaza una notificación sin mensaje", () => {
    const datos = automatizacionValida();

    datos.acciones = [
        {
            tipo: "CREAR_NOTIFICACION",
            configuracion: {
                titulo: "Aviso",
                mensaje: " ",
                tipo: "Información",
            },
        },
    ];

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /mensaje de la notificación.*obligatorio/i,
    );
});

test("Acepta una actualización parcial válida", () => {
    assert.equal(
        automationValidation.validarActualizar({
            descripcion: "Descripción actualizada",
        }),
        true,
    );
});

test("Rechaza una actualización vacía", () => {
    assert.throws(
        () => automationValidation.validarActualizar({}),
        /al menos un campo para actualizar/i,
    );
});

test("Rechaza activa cuando no es un booleano", () => {
    const datos = automatizacionValida();
    datos.activa = "false";

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /campo activa debe ser booleano/i,
    );
});

test("Rechaza un orden de acción menor que uno", () => {
    const datos = automatizacionValida();
    datos.acciones[0].orden = 0;

    assert.throws(
        () => automationValidation.validarCrear(datos),
        /orden de la acción.*entero positivo/i,
    );
});
