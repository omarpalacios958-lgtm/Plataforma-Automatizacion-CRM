// ============================================
// Archivo: user.service.js
// Descripción:
// Contiene la lógica de negocio del módulo
// de usuarios.
// ============================================

const bcrypt = require("bcrypt");
const userRepository = require("../repositories/user.repository");
const userValidation = require("../validations/user.validation");
const userTransformer = require("../transformers/user.transformer");

class UserService {

    /**
     * Obtiene todos los usuarios activos.
     *
     * @returns {Promise<Object>}
     */
    async obtenerTodos() {

        const usuarios = await userRepository.obtenerTodos();

        return {
            success: true,
            data: userTransformer.transformarLista(usuarios)
        };

    }

    /**
     * Obtiene un usuario por su ID.
     *
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async obtenerPorId(id) {

        const usuario = await userRepository.obtenerPorId(id);

        if (!usuario) {
            throw new Error("Usuario no encontrado.");
        }

        return {
            success: true,
            data: userTransformer.transformar(usuario)
        };

    }

    /**
     * Crea un nuevo usuario.
     *
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async crear(datos) {

        // Validar información
        const error = userValidation.validarCreacion(datos);

        if (error) {
            throw new Error(error);
        }

        // Verificar si el correo ya existe
        const usuarioExistente = await userRepository.buscarPorCorreo(datos.correo);

        if (usuarioExistente) {
            throw new Error("El correo ya se encuentra registrado.");
        }

        // Encriptar contraseña
        const passwordHash = await bcrypt.hash(datos.password, 10);

        // Crear usuario
        const nuevoUsuario = await userRepository.crear({
            ...datos,
            password: passwordHash
        });

        return {
            success: true,
            message: "Usuario creado correctamente.",
            data: userTransformer.transformar(nuevoUsuario)
        };

    }

    /**
     * Actualiza un usuario.
     *
     * @param {number} id
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async actualizar(id, datos) {

        // Validar información
        const error = userValidation.validarActualizacion(datos);

        if (error) {
            throw new Error(error);
        }

        // Verificar existencia del usuario
        const usuario = await userRepository.buscarPorId(id);

        if (!usuario) {
            throw new Error("Usuario no encontrado.");
        }

        // Verificar si el correo pertenece a otro usuario
        const correoExistente = await userRepository.buscarPorCorreo(datos.correo);

        if (correoExistente && correoExistente.id !== id) {
            throw new Error("El correo ya se encuentra registrado.");
        }

        // Preparar datos para actualizar
        const datosActualizar = {
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            roleId: datos.roleId
        };

        // Actualizar contraseña únicamente si fue enviada
        if (datos.password && datos.password.trim() !== "") {

            datosActualizar.password = await bcrypt.hash(
                datos.password,
                10
            );

        }

        // Actualizar usuario
        const usuarioActualizado = await userRepository.actualizar(
            id,
            datosActualizar
        );

        return {
            success: true,
            message: "Usuario actualizado correctamente.",
            data: userTransformer.transformar(usuarioActualizado)
        };

    }

    /**
     * Realiza la eliminación lógica de un usuario.
     *
     * @param {number} id
     * @returns {Promise<Object>}
     */
    async eliminar(id) {

        // Verificar existencia del usuario
        const usuario = await userRepository.buscarPorId(id);

        if (!usuario) {
            throw new Error("Usuario no encontrado.");
        }

        // Verificar si ya fue eliminado
        if (!usuario.activo) {
            throw new Error("El usuario ya se encuentra inactivo.");
        }

        // Realizar eliminación lógica
        await userRepository.eliminar(id);

        return {
            success: true,
            message: "Usuario eliminado correctamente."
        };

    }

}

module.exports = new UserService();