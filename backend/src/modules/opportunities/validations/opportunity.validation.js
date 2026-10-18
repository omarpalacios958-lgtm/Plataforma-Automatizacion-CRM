const ETAPAS_VALIDAS = [
    "Nuevo",
    "Contactado",
    "Calificado",
    "Cotización",
    "Negociación",
    "Ganado",
];

const validarTexto = (valor, campo, maximo) => {
    if (typeof valor !== "string") {
        throw new Error(`El campo ${campo} debe ser un texto.`);
    }

    if (!valor.trim()) {
        throw new Error(`El campo ${campo} no puede estar vacío.`);
    }

    if (valor.length > maximo) {
        throw new Error(
            `El campo ${campo} no puede superar los ${maximo} caracteres.`
        );
    }
};

const validarMonto = (monto) => {
    if (monto === null || monto === "") {
        throw new Error("El monto es inválido.");
    }

    const numero = Number(monto);

    if (!Number.isFinite(numero) || numero < 0) {
        throw new Error("El monto es inválido.");
    }

    const partes = String(monto).split(".");

    if (partes[1] && partes[1].length > 2) {
        throw new Error(
            "El monto no puede tener más de 2 decimales."
        );
    }

    const parteEntera = partes[0].replace("-", "");

    if (parteEntera.length > 10) {
        throw new Error(
            "El monto no puede superar los 10 dígitos enteros."
        );
    }
};

const validarFecha = (fecha) => {
    if (fecha === null || fecha === "") {
        throw new Error("La fecha de cierre es inválida.");
    }

    const fechaParseada = Date.parse(fecha);

    if (Number.isNaN(fechaParseada)) {
        throw new Error("La fecha de cierre es inválida.");
    }
};

const validarEtapa = (etapa) => {
    if (!ETAPAS_VALIDAS.includes(etapa)) {
        throw new Error("La etapa de la oportunidad no es válida.");
    }
};

const validarLeadId = (leadId) => {
    const numero = Number(leadId);

    if (!Number.isInteger(numero) || numero <= 0) {
        throw new Error("El Lead seleccionado no es válido.");
    }
};

const validarCrear = (datos) => {
    if (!datos || typeof datos !== "object") {
        throw new Error("Los datos de la oportunidad son obligatorios.");
    }

    if (datos.nombre === undefined || datos.nombre === null) {
        throw new Error("El nombre de la oportunidad es obligatorio.");
    }

    validarTexto(datos.nombre, "nombre", 150);

    if (datos.descripcion !== undefined && datos.descripcion !== null) {
        if (typeof datos.descripcion !== "string") {
            throw new Error(
                "El campo descripcion debe ser un texto."
            );
        }

        if (datos.descripcion.length > 1000) {
            throw new Error(
                "El campo descripcion no puede superar los 1000 caracteres."
            );
        }
    }

    if (datos.leadId === undefined || datos.leadId === null) {
        throw new Error("El Lead es obligatorio.");
    }

    validarLeadId(datos.leadId);

    if (datos.etapa !== undefined && datos.etapa !== null) {
        validarEtapa(datos.etapa);
    }

    if (datos.monto !== undefined) {
        validarMonto(datos.monto);
    }

    if (datos.fechaCierre !== undefined) {
        validarFecha(datos.fechaCierre);
    }
};

const validarActualizar = (datos) => {
    if (!datos || typeof datos !== "object") {
        throw new Error(
            "Los datos de actualización son obligatorios."
        );
    }

    if (Object.keys(datos).length === 0) {
        throw new Error(
            "Debe proporcionar al menos un dato para actualizar."
        );
    }

    if (datos.nombre !== undefined) {
        validarTexto(datos.nombre, "nombre", 150);
    }

    if (datos.descripcion !== undefined && datos.descripcion !== null) {
        if (typeof datos.descripcion !== "string") {
            throw new Error(
                "El campo descripcion debe ser un texto."
            );
        }

        if (datos.descripcion.length > 1000) {
            throw new Error(
                "El campo descripcion no puede superar los 1000 caracteres."
            );
        }
    }

    if (datos.leadId !== undefined) {
        validarLeadId(datos.leadId);
    }

    if (datos.etapa !== undefined) {
        validarEtapa(datos.etapa);
    }

    if (datos.monto !== undefined) {
        validarMonto(datos.monto);
    }

    if (datos.fechaCierre !== undefined) {
        validarFecha(datos.fechaCierre);
    }
};

module.exports = {
    validarCrear,
    validarActualizar,
};