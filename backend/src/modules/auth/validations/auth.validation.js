// ============================================
// Archivo: auth.validation.js
// Descripción:
// Validaciones del módulo de autenticación.
// Se encarga de verificar que los datos
// enviados por el cliente sean válidos.
// ============================================

class AuthValidation {

    /**
     * Valida los datos para el registro
     * de un nuevo usuario.
     */
    validarRegistro(datos) {

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
     * Valida los datos para iniciar sesión.
     *
     * @param {Object} datos
     * @returns {string|null}
     */
    validarLogin(datos) {

        if (!datos.correo) {
            return "El correo es obligatorio.";
        }

        if (!datos.password) {
            return "La contraseña es obligatoria.";
        }

        return null;

    }

}

module.exports = new AuthValidation();