// ============================================
// Archivo: company.service.js
// Descripción:
// Lógica de negocio del módulo de empresas.
// ============================================

const companyRepository = require("../repositories/company.repository");

class CompanyService {

    /**
     * Obtiene las empresas según el usuario autenticado.
     *
     * Administrador:
     * - Puede consultar todas las empresas activas.
     *
     * Vendedor:
     * - Solo puede consultar sus propias empresas activas.
     *
     * @param {Object} usuario
     * @returns {Promise<Array>}
     */
    async obtenerTodos(usuario) {

        if (usuario.role === "Administrador") {
            return await companyRepository.obtenerTodos();
        }

        return await companyRepository.obtenerPorUsuario(
            usuario.id
        );

    }

    /**
     * Obtiene las empresas pertenecientes a un usuario.
     *
     * Este método se conserva como operación interna del módulo.
     *
     * @param {number} userId
     * @returns {Promise<Array>}
     */
    async obtenerPorUsuario(userId) {

        return await companyRepository.obtenerPorUsuario(userId);

    }

    /**
     * Obtiene una empresa por ID.
     *
     * Administrador:
     * - Puede acceder a cualquier empresa activa.
     *
     * Vendedor:
     * - Solo puede acceder a una empresa de su propiedad.
     *
     * @param {number} id
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async obtenerPorId(id, usuario) {

        const empresa = await companyRepository.obtenerPorId(id);

        if (!empresa) {
            throw new Error(
                "La empresa no existe o está inactiva."
            );
        }

        if (
            usuario.role !== "Administrador" &&
            empresa.userId !== usuario.id
        ) {
            throw new Error(
                "No tiene permisos para acceder a esta empresa."
            );
        }

        return empresa;

    }

    /**
     * Crea una empresa.
     *
     * El userId siempre se obtiene del usuario autenticado.
     * No se permite confiar en un userId enviado por el cliente.
     *
     * @param {Object} datos
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async crear(datos, usuario) {

        const datosEmpresa = {

            nombre: datos.nombre,

            razonSocial: datos.razonSocial,

            rfc: datos.rfc,

            industria: datos.industria,

            sitioWeb: datos.sitioWeb,

            telefono: datos.telefono,

            direccion: datos.direccion,

            userId: usuario.id

        };

        return await companyRepository.crear(
            datosEmpresa
        );

    }

    /**
     * Actualiza una empresa.
     *
     * Se utiliza una lista blanca para evitar que el cliente
     * pueda modificar campos sensibles como userId o activo.
     *
     * @param {number} id
     * @param {Object} datos
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async actualizar(id, datos, usuario) {

        const empresa = await this.obtenerPorId(
            id,
            usuario
        );

        const datosPermitidos = {};

        if (datos.nombre !== undefined) {
            datosPermitidos.nombre = datos.nombre;
        }

        if (datos.razonSocial !== undefined) {
            datosPermitidos.razonSocial = datos.razonSocial;
        }

        if (datos.rfc !== undefined) {
            datosPermitidos.rfc = datos.rfc;
        }

        if (datos.industria !== undefined) {
            datosPermitidos.industria = datos.industria;
        }

        if (datos.sitioWeb !== undefined) {
            datosPermitidos.sitioWeb = datos.sitioWeb;
        }

        if (datos.telefono !== undefined) {
            datosPermitidos.telefono = datos.telefono;
        }

        if (datos.direccion !== undefined) {
            datosPermitidos.direccion = datos.direccion;
        }

        return await companyRepository.actualizar(
            empresa.id,
            datosPermitidos
        );

    }

    /**
     * Eliminación lógica de una empresa.
     *
     * @param {number} id
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async eliminar(id, usuario) {

        const empresa = await this.obtenerPorId(
            id,
            usuario
        );

        return await companyRepository.eliminar(
            empresa.id
        );

    }

}

module.exports = new CompanyService();