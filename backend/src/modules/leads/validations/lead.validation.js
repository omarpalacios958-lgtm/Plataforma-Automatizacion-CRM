// ============================================
// Archivo: lead.validation.js
// Descripción:
// Validaciones del módulo de Leads.
// ============================================

class LeadValidation {

    /**
     * Valores permitidos para el estado de un Lead.
     */
    estadosPermitidos = [
        "Nuevo",
        "Contactado",
        "Calificado",
        "Convertido",
        "Perdido"
    ];

    /**
     * Valores permitidos para la prioridad.
     */
    prioridadesPermitidas = [
        "Baja",
        "Media",
        "Alta"
    ];

    /**
     * Valida los datos para crear un Lead.
     *
     * @param {Object} datos
     */
    validarCrear(datos) {

        // ==============================
        // Título
        // ==============================

        if (
            typeof datos.titulo !== "string" ||
            datos.titulo.trim() === ""
        ) {

            throw new Error(
                "El título es obligatorio."
            );

        }

        if (datos.titulo.length > 150) {

            throw new Error(
                "El título no puede exceder los 150 caracteres."
            );

        }

        // ==============================
        // Descripción
        // ==============================

        if (
            datos.descripcion !== undefined &&
            datos.descripcion !== null
        ) {

            if (typeof datos.descripcion !== "string") {

                throw new Error(
                    "La descripción debe ser un texto."
                );

            }

            if (datos.descripcion.length > 1000) {

                throw new Error(
                    "La descripción no puede exceder los 1000 caracteres."
                );

            }

        }

        // ==============================
        // Contacto
        // ==============================

        if (
            datos.contactId === undefined ||
            datos.contactId === null ||
            datos.contactId === "" ||
            !Number.isInteger(Number(datos.contactId)) ||
            Number(datos.contactId) <= 0
        ) {

            throw new Error(
                "El contacto es obligatorio."
            );

        }

        // ==============================
        // Estado
        // ==============================

        if (datos.estado !== undefined && datos.estado !== null) {

            if (
                typeof datos.estado !== "string" ||
                !this.estadosPermitidos.includes(datos.estado)
            ) {

                throw new Error(
                    "El estado del Lead no es válido."
                );

            }

        }

        // ==============================
        // Origen
        // ==============================

        if (
            datos.origen !== undefined &&
            datos.origen !== null
        ) {

            if (typeof datos.origen !== "string") {

                throw new Error(
                    "El origen debe ser un texto."
                );

            }

            if (datos.origen.length > 100) {

                throw new Error(
                    "El origen no puede exceder los 100 caracteres."
                );

            }

        }

        // ==============================
        // Prioridad
        // ==============================

        if (
            datos.prioridad !== undefined &&
            datos.prioridad !== null
        ) {

            if (
                typeof datos.prioridad !== "string" ||
                !this.prioridadesPermitidas.includes(datos.prioridad)
            ) {

                throw new Error(
                    "La prioridad del Lead no es válida."
                );

            }

        }

        // ==============================
        // Valor estimado
        // ==============================

        this.validarValorEstimado(
            datos.valorEstimado
        );

        // ==============================
        // Fecha de seguimiento
        // ==============================

        this.validarFechaSeguimiento(
            datos.fechaSeguimiento
        );

    }

    /**
     * Valida los datos para actualizar
     * un Lead.
     *
     * Todos los campos son opcionales.
     *
     * @param {Object} datos
     */
    validarActualizar(datos) {

        if (!datos || Object.keys(datos).length === 0) {

            throw new Error(
                "Debe proporcionar al menos un dato para actualizar."
            );

        }

        // ==============================
        // Título
        // ==============================

        if (datos.titulo !== undefined) {

            if (
                typeof datos.titulo !== "string" ||
                datos.titulo.trim() === ""
            ) {

                throw new Error(
                    "El título no puede estar vacío."
                );

            }

            if (datos.titulo.length > 150) {

                throw new Error(
                    "El título no puede exceder los 150 caracteres."
                );

            }

        }

        // ==============================
        // Descripción
        // ==============================

        if (
            datos.descripcion !== undefined &&
            datos.descripcion !== null
        ) {

            if (typeof datos.descripcion !== "string") {

                throw new Error(
                    "La descripción debe ser un texto."
                );

            }

            if (datos.descripcion.length > 1000) {

                throw new Error(
                    "La descripción no puede exceder los 1000 caracteres."
                );

            }

        }

        // ==============================
        // Contacto
        // ==============================

        if (datos.contactId !== undefined) {

            if (
                datos.contactId === null ||
                datos.contactId === "" ||
                !Number.isInteger(Number(datos.contactId)) ||
                Number(datos.contactId) <= 0
            ) {

                throw new Error(
                    "El contacto es inválido."
                );

            }

        }

        // ==============================
        // Estado
        // ==============================

        if (datos.estado !== undefined && datos.estado !== null) {

            if (
                typeof datos.estado !== "string" ||
                !this.estadosPermitidos.includes(datos.estado)
            ) {

                throw new Error(
                    "El estado del Lead no es válido."
                );

            }

        }

        // ==============================
        // Origen
        // ==============================

        if (
            datos.origen !== undefined &&
            datos.origen !== null
        ) {

            if (typeof datos.origen !== "string") {

                throw new Error(
                    "El origen debe ser un texto."
                );

            }

            if (datos.origen.length > 100) {

                throw new Error(
                    "El origen no puede exceder los 100 caracteres."
                );

            }

        }

        // ==============================
        // Prioridad
        // ==============================

        if (
            datos.prioridad !== undefined &&
            datos.prioridad !== null
        ) {

            if (
                typeof datos.prioridad !== "string" ||
                !this.prioridadesPermitidas.includes(datos.prioridad)
            ) {

                throw new Error(
                    "La prioridad del Lead no es válida."
                );

            }

        }

        // ==============================
        // Valor estimado
        // ==============================

        this.validarValorEstimado(
            datos.valorEstimado
        );

        // ==============================
        // Fecha de seguimiento
        // ==============================

        this.validarFechaSeguimiento(
            datos.fechaSeguimiento
        );

    }

    /**
     * Valida el valor estimado.
     *
     * @param {*} valor
     */
    validarValorEstimado(valor) {

        if (
            valor === undefined ||
            valor === null ||
            valor === ""
        ) {

            return;

        }

        const numero = Number(valor);

        if (
            !Number.isFinite(numero) ||
            numero < 0
        ) {

            throw new Error(
                "El valor estimado es inválido."
            );

        }

        const partes = String(valor).split(".");

        if (
            partes.length === 2 &&
            partes[1].length > 2
        ) {

            throw new Error(
                "El valor estimado no puede tener más de 2 decimales."
            );

        }

        if (partes[0].replace("-", "").length > 10) {

            throw new Error(
                "El valor estimado excede el límite permitido."
            );

        }

    }

    /**
     * Valida la fecha de seguimiento.
     *
     * @param {*} fecha
     */
    validarFechaSeguimiento(fecha) {

        if (
            fecha === undefined ||
            fecha === null ||
            fecha === ""
        ) {

            return;

        }

        if (typeof fecha !== "string") {

            throw new Error(
                "La fecha de seguimiento debe ser una fecha válida."
            );

        }

        const fechaConvertida = new Date(fecha);

        if (Number.isNaN(fechaConvertida.getTime())) {

            throw new Error(
                "La fecha de seguimiento no es válida."
            );

        }

    }

}

module.exports = new LeadValidation();