// ============================================
// Archivo: activity.validation.js
// Descripción:
// Validaciones del módulo de Actividades.
// Verifica la información antes de enviarla
// a la capa de negocio.
// ============================================

class ActivityValidation {

    // ============================================
    // Tipos de actividad permitidos
    // ============================================

    tiposPermitidos = [

        "Llamada",
        "Correo",
        "Reunión",
        "Mensaje",
        "Visita",
        "Otro"

    ];

    // ============================================
    // Validar creación
    // ============================================

    validarCrear(datos) {

        // ----------------------------------------
        // Tipo
        // ----------------------------------------

        if (
            typeof datos.tipo !== "string" ||
            datos.tipo.trim() === ""
        ) {

            throw new Error(
                "El tipo de actividad es obligatorio."
            );

        }

        if (!this.tiposPermitidos.includes(datos.tipo)) {

            throw new Error(
                "El tipo de actividad no es válido."
            );

        }

        // ----------------------------------------
        // Asunto
        // ----------------------------------------

        if (
            typeof datos.asunto !== "string" ||
            datos.asunto.trim() === ""
        ) {

            throw new Error(
                "El asunto es obligatorio."
            );

        }

        // ----------------------------------------
        // Fecha de actividad
        // ----------------------------------------

        if (!datos.fechaActividad) {

            throw new Error(
                "La fecha de la actividad es obligatoria."
            );

        }

        if (
            Number.isNaN(
                new Date(datos.fechaActividad).getTime()
            )
        ) {

            throw new Error(
                "La fecha de la actividad no es válida."
            );

        }

        // ----------------------------------------
        // Opportunity
        // ----------------------------------------

        const opportunityId = Number(
            datos.opportunityId
        );

        if (
            !Number.isInteger(opportunityId) ||
            opportunityId <= 0
        ) {

            throw new Error(
                "El opportunityId debe ser un ID válido."
            );

        }

    }

    // ============================================
    // Validar actualización
    // ============================================

    validarActualizar(datos) {

        // ----------------------------------------
        // Verificación de objeto y contenido mínimo
        // ----------------------------------------

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

        // ----------------------------------------
        // Tipo
        // ----------------------------------------

        if (datos.tipo !== undefined) {

            if (
                typeof datos.tipo !== "string" ||
                datos.tipo.trim() === ""
            ) {

                throw new Error(
                    "El tipo de actividad no puede estar vacío."
                );

            }

            if (
                !this.tiposPermitidos.includes(
                    datos.tipo
                )
            ) {

                throw new Error(
                    "El tipo de actividad no es válido."
                );

            }

        }

        // ----------------------------------------
        // Asunto
        // ----------------------------------------

        if (datos.asunto !== undefined) {

            if (
                typeof datos.asunto !== "string" ||
                datos.asunto.trim() === ""
            ) {

                throw new Error(
                    "El asunto no puede estar vacío."
                );

            }

        }

        // ----------------------------------------
        // Fecha de actividad
        // ----------------------------------------

        if (datos.fechaActividad !== undefined) {

            if (
                Number.isNaN(
                    new Date(
                        datos.fechaActividad
                    ).getTime()
                )
            ) {

                throw new Error(
                    "La fecha de la actividad no es válida."
                );

            }

        }

        // ----------------------------------------
        // Opportunity
        // ----------------------------------------

        if (datos.opportunityId !== undefined) {

            const opportunityId = Number(
                datos.opportunityId
            );

            if (
                !Number.isInteger(opportunityId) ||
                opportunityId <= 0
            ) {

                throw new Error(
                    "El opportunityId debe ser un ID válido."
                );

            }

        }

    }

}

// ============================================

module.exports = new ActivityValidation();