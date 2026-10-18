// ============================================
// Archivo: user.validation.js
// Descripción:
// Validaciones del módulo de usuarios.
// Se encarga de verificar que la información
// enviada por el cliente sea válida antes
// de ser procesada.
// ============================================

class UserValidation {

    /**
     * Valida la información para crear
     * un nuevo usuario.
     *
     * @param {Object} datos
     * @returns {string|null}
     */
    validarCreacion(datos) {

        const {
            nombre,
            apellido,
            correo,
            password,
            roleId
        } = datos;

        // Nombre
        if (!nombre || nombre.trim() === "") {
            return "El nombre es obligatorio.";
        }

        // Apellido
        if (!apellido || apellido.trim() === "") {
            return "El apellido es obligatorio.";
        }

        // Correo
        if (!correo || correo.trim() === "") {
            return "El correo es obligatorio.";
        }

        // Contraseña
        if (!password || password.length < 6) {
            return "La contraseña debe tener al menos 6 caracteres.";
        }

        // Rol
        if (!roleId) {
            return "Debe seleccionar un rol.";
        }

        return null;

    }

    /**
     * Valida la información para actualizar un usuario.
     *
     * @param {Object} datos
     * @returns {string|null}
     */
    validarActualizacion(datos) {

        if (!datos.nombre || datos.nombre.trim() === "") {
            return "El nombre es obligatorio.";
        }

        if (!datos.apellido || datos.apellido.trim() === "") {
            return "El apellido es obligatorio.";
        }

        if (!datos.correo || datos.correo.trim() === "") {
            return "El correo es obligatorio.";
        }

        // Contraseña
        if (
            datos.password !== undefined &&
            datos.password !== null &&
            datos.password.trim() !== "" &&
            datos.password.length < 6
        ) {
            return "La contraseña debe tener al menos 6 caracteres.";
        }

        if (!datos.roleId) {
            return "El rol es obligatorio.";
        }

        return null;

    }

}

module.exports = new UserValidation();