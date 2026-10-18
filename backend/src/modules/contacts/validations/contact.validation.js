// ============================================
// Archivo: contact.validation.js
// Descripción:
// Contiene las validaciones del módulo
// de contactos.
// ============================================

class ContactValidation {

    /**
     * Valida la información para crear un contacto.
     *
     * @param {Object} datos
     * @returns {String|null}
     */
    validarCrear(datos) {

        // Nombre obligatorio
        if (
            typeof datos.nombre !== "string" ||
            datos.nombre.trim() === ""
        ) {

            return "El nombre es obligatorio.";

        }

        // Longitud del nombre
        if (datos.nombre.length > 100) {

            return "El nombre no puede exceder los 100 caracteres.";

        }

        // Apellido
        if (
            datos.apellido !== undefined &&
            datos.apellido !== null
        ) {

            if (typeof datos.apellido !== "string") {

                return "El apellido debe ser un texto.";

            }

            if (datos.apellido.length > 100) {

                return "El apellido no puede exceder los 100 caracteres.";

            }

        }

        // Correo
        if (
            datos.correo !== undefined &&
            datos.correo !== null
        ) {

            if (typeof datos.correo !== "string") {

                return "El correo electrónico debe ser un texto.";

            }

            const expresionCorreo =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!expresionCorreo.test(datos.correo)) {

                return "El correo electrónico no es válido.";

            }

        }

        // Teléfono
        if (
            datos.telefono !== undefined &&
            datos.telefono !== null
        ) {

            if (typeof datos.telefono !== "string") {

                return "El número telefónico debe ser un texto.";

            }

            const expresionTelefono =
                /^[0-9()+\-\s]{7,20}$/;

            if (!expresionTelefono.test(datos.telefono)) {

                return "El número telefónico no es válido.";

            }

        }

        // Puesto
        if (
            datos.puesto !== undefined &&
            datos.puesto !== null
        ) {

            if (typeof datos.puesto !== "string") {

                return "El puesto debe ser un texto.";

            }

            if (datos.puesto.length > 100) {

                return "El puesto no puede exceder los 100 caracteres.";

            }

        }

        // Empresa
        if (
            datos.companyId !== undefined &&
            datos.companyId !== null
        ) {

            if (
                !Number.isInteger(Number(datos.companyId)) ||
                Number(datos.companyId) <= 0
            ) {

                return "El companyId debe ser un número entero válido.";

            }

        }

        return null;

    }

    /**
     * Valida la información para actualizar un contacto.
     *
     * Todos los campos son opcionales porque la actualización
     * permite modificar parcialmente el contacto.
     *
     * @param {Object} datos
     * @returns {String|null}
     */
    validarActualizar(datos) {

        if (!datos || Object.keys(datos).length === 0) {

            return "Debe proporcionar al menos un dato para actualizar.";

        }

        // Nombre
        if (datos.nombre !== undefined) {

            if (
                typeof datos.nombre !== "string" ||
                datos.nombre.trim() === ""
            ) {

                return "El nombre debe ser un texto no vacío.";

            }

            if (datos.nombre.length > 100) {

                return "El nombre no puede exceder los 100 caracteres.";

            }

        }

        // Apellido
        if (
            datos.apellido !== undefined &&
            datos.apellido !== null
        ) {

            if (typeof datos.apellido !== "string") {

                return "El apellido debe ser un texto.";

            }

            if (datos.apellido.length > 100) {

                return "El apellido no puede exceder los 100 caracteres.";

            }

        }

        // Correo
        if (
            datos.correo !== undefined &&
            datos.correo !== null
        ) {

            if (typeof datos.correo !== "string") {

                return "El correo electrónico debe ser un texto.";

            }

            const expresionCorreo =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!expresionCorreo.test(datos.correo)) {

                return "El correo electrónico no es válido.";

            }

        }

        // Teléfono
        if (
            datos.telefono !== undefined &&
            datos.telefono !== null
        ) {

            if (typeof datos.telefono !== "string") {

                return "El número telefónico debe ser un texto.";

            }

            const expresionTelefono =
                /^[0-9()+\-\s]{7,20}$/;

            if (!expresionTelefono.test(datos.telefono)) {

                return "El número telefónico no es válido.";

            }

        }

        // Puesto
        if (
            datos.puesto !== undefined &&
            datos.puesto !== null
        ) {

            if (typeof datos.puesto !== "string") {

                return "El puesto debe ser un texto.";

            }

            if (datos.puesto.length > 100) {

                return "El puesto no puede exceder los 100 caracteres.";

            }

        }

        // Empresa
        if (
            datos.companyId !== undefined &&
            datos.companyId !== null
        ) {

            if (
                !Number.isInteger(Number(datos.companyId)) ||
                Number(datos.companyId) <= 0
            ) {

                return "El companyId debe ser un número entero válido.";

            }

        }

        return null;

    }

}

module.exports = new ContactValidation();