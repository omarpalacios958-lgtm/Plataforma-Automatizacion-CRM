// ============================================
// Archivo: notification.validation.js
// Descripción:
// Validaciones del módulo de Notificaciones.
// Verifica la información antes de enviarla
// al repositorio.
// ============================================

class NotificationValidation {

    /**
     * Valida los datos para crear una notificación.
     *
     * @param {Object} datos
     */
    validarCrear(datos) {

        if (
            typeof datos.titulo !== "string" ||
            datos.titulo.trim() === ""
        ) {

            throw new Error("El título es obligatorio.");

        }

        if (datos.titulo.length > 150) {

            throw new Error(
                "El título no puede exceder los 150 caracteres."
            );

        }

        if (
            typeof datos.mensaje !== "string" ||
            datos.mensaje.trim() === ""
        ) {

            throw new Error("El mensaje es obligatorio.");

        }

        if (datos.mensaje.length > 500) {

            throw new Error(
                "El mensaje no puede exceder los 500 caracteres."
            );

        }

        if (
            typeof datos.tipo !== "string" ||
            datos.tipo.trim() === ""
        ) {

            throw new Error(
                "El tipo de notificación es obligatorio."
            );

        }

        if (datos.tipo.length > 50) {

            throw new Error(
                "El tipo de notificación no puede exceder los 50 caracteres."
            );

        }

        if (
            datos.leida !== undefined &&
            typeof datos.leida !== "boolean"
        ) {

            throw new Error(
                "El campo leida debe ser booleano."
            );

        }

    }

    /**
     * Valida los datos para actualizar
     * una notificación.
     *
     * Permite actualizaciones parciales.
     *
     * @param {Object} datos
     */
    validarActualizar(datos) {

        if (Object.keys(datos).length === 0) {

            throw new Error(
                "No se recibieron datos para actualizar."
            );

        }

        if (datos.titulo !== undefined) {

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

        }

        if (datos.mensaje !== undefined) {

            if (
                typeof datos.mensaje !== "string" ||
                datos.mensaje.trim() === ""
            ) {

                throw new Error(
                    "El mensaje es obligatorio."
                );

            }

            if (datos.mensaje.length > 500) {

                throw new Error(
                    "El mensaje no puede exceder los 500 caracteres."
                );

            }

        }

        if (datos.tipo !== undefined) {

            if (
                typeof datos.tipo !== "string" ||
                datos.tipo.trim() === ""
            ) {

                throw new Error(
                    "El tipo de notificación es obligatorio."
                );

            }

            if (datos.tipo.length > 50) {

                throw new Error(
                    "El tipo de notificación no puede exceder los 50 caracteres."
                );

            }

        }

        if (
            datos.leida !== undefined &&
            typeof datos.leida !== "boolean"
        ) {

            throw new Error(
                "El campo leida debe ser booleano."
            );

        }

    }

}

module.exports = new NotificationValidation();