
 // ============================================
 // Archivo: auth.service.js
 // Descripción:
 // Contiene la lógica de negocio del módulo
 // de autenticación.
 // ============================================

const bcrypt = require("bcrypt");
const { generarToken } = require("../../../utils/jwt");
const authRepository = require("../repositories/auth.repository");
const authValidation = require("../validations/auth.validation");
const userRepository = require("../../users/repositories/user.repository");

class AuthService {
    /**
     * Verifica el estado del módulo.
     */
    async verificarEstado() {
        return {
            modulo: "Autenticación",
            estado: "Activo",
            mensaje: "AuthService y AuthRepository funcionando correctamente."
        };
    }

    /**
     * Busca un usuario por correo.
     */
    async buscarPorCorreo(correo) {
        return await authRepository.buscarPorCorreo(correo);
    }

    /**
     * Registra un nuevo usuario.
     *
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async register(datos) {
        // Validar información
        const error = authValidation.validarRegistro(datos);

        if (error) {
            throw new Error(error);
        }

        // Verificar si el correo ya existe
        const usuario = await authRepository.buscarPorCorreo(datos.correo);

        if (usuario) {
            throw new Error("El correo ya se encuentra registrado.");
        }

        // Verificar si el rol existe
        const rol = await userRepository.buscarRolPorId(
            Number(datos.roleId)
        );

        if (!rol) {
            throw new Error("El rol seleccionado no existe.");
        }

        // Encriptar contraseña
        const passwordHash = await bcrypt.hash(datos.password, 10);

        // Crear usuario en PostgreSQL
        const nuevoUsuario = await authRepository.crearUsuario({
            ...datos,
            password: passwordHash
        });

        // Respuesta
        return {
            success: true,
            message: "Usuario registrado correctamente.",
            usuario: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                apellido: nuevoUsuario.apellido,
                correo: nuevoUsuario.correo,
                roleId: nuevoUsuario.roleId,
                activo: nuevoUsuario.activo
            }
        };
    }

    /**
     * Inicia sesión de un usuario.
     *
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async login(datos) {
        // Validar información recibida
        const error = authValidation.validarLogin(datos);

        if (error) {
            throw new Error(error);
        }

        // Buscar usuario por correo
        const usuario = await authRepository.buscarPorCorreo(datos.correo);

        if (!usuario) {
            throw new Error("Correo o contraseña incorrectos.");
        }

        // Comparar contraseña
        const passwordCorrecto = await bcrypt.compare(
            datos.password,
            usuario.password
        );

        if (!passwordCorrecto) {
            throw new Error("Correo o contraseña incorrectos.");
        }

        // Generar JWT
        const token = generarToken({
            id: usuario.id,
            correo: usuario.correo,
            role: usuario.role.nombre
        });

        // Respuesta
        return {
            success: true,
            message: "Inicio de sesión exitoso.",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                role: usuario.role.nombre
            }
        };
    }
}

module.exports = new AuthService();
