// ============================================
// Archivo: contact.service.js
// Descripción:
// Contiene la lógica de negocio del módulo
// de contactos.
// ============================================

const contactRepository = require("../repositories/contact.repository");
const companyRepository = require("../../companies/repositories/company.repository");
const contactValidation = require("../validations/contact.validation");

class ContactService {

    /**
     * Valida que la empresa exista, esté activa
     * y que el usuario tenga permisos para utilizarla.
     *
     * Administrador:
     *      Puede utilizar cualquier empresa activa.
     *
     * Vendedor:
     *      Solo puede utilizar empresas propias.
     *
     * @param {number} companyId
     * @param {Object} usuario
     */
    async validarEmpresa(companyId, usuario) {

        if (companyId === undefined || companyId === null) {
            return;
        }

        const empresa = await companyRepository.obtenerPorId(
            Number(companyId)
        );

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
                "No tiene permisos para asociar el contacto a esta empresa."
            );

        }

    }

    /**
     * Obtiene todos los contactos según el usuario autenticado.
     *
     * Administrador:
     *      Todos los contactos activos.
     *
     * Vendedor:
     *      Solo sus contactos activos.
     *
     * @param {Object} usuario
     * @returns {Promise<Array>}
     */
    async obtenerTodos(usuario) {

        if (usuario.role === "Administrador") {

            return await contactRepository.obtenerTodos();

        }

        return await contactRepository.obtenerPorUsuario(
            usuario.id
        );

    }

    /**
     * Obtiene un contacto por ID.
     *
     * @param {number} id
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async obtenerPorId(id, usuario) {

        const contacto = await contactRepository.obtenerPorId(id);

        if (!contacto || !contacto.activo) {

            throw new Error(
                "Contacto no encontrado."
            );

        }

        if (usuario.role === "Administrador") {

            return contacto;

        }

        if (contacto.userId !== usuario.id) {

            throw new Error(
                "No tiene permisos para acceder a este contacto."
            );

        }

        return contacto;

    }

    /**
     * Crea un nuevo contacto.
     *
     * El userId siempre se obtiene del usuario autenticado.
     * Nunca se utiliza un userId enviado por el cliente.
     *
     * @param {Object} datos
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async crear(datos, usuario) {

        const error = contactValidation.validarCrear(datos);

        if (error) {

            throw new Error(error);

        }

        await this.validarEmpresa(
            datos.companyId,
            usuario
        );

        return await contactRepository.crear({

            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            telefono: datos.telefono,
            puesto: datos.puesto,
            companyId: datos.companyId,
            userId: usuario.id

        });

    }

    /**
     * Actualiza un contacto.
     *
     * Se utiliza una lista blanca para permitir únicamente
     * campos propios del contacto.
     *
     * @param {number} id
     * @param {Object} datos
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async actualizar(id, datos, usuario) {

        const contacto = await this.obtenerPorId(
            id,
            usuario
        );

        const error = contactValidation.validarActualizar(datos);

        if (error) {

            throw new Error(error);

        }

        if (datos.companyId !== undefined) {

            await this.validarEmpresa(
                datos.companyId,
                usuario
            );

        }

        const datosPermitidos = {};

        if (datos.nombre !== undefined) {
            datosPermitidos.nombre = datos.nombre;
        }

        if (datos.apellido !== undefined) {
            datosPermitidos.apellido = datos.apellido;
        }

        if (datos.correo !== undefined) {
            datosPermitidos.correo = datos.correo;
        }

        if (datos.telefono !== undefined) {
            datosPermitidos.telefono = datos.telefono;
        }

        if (datos.puesto !== undefined) {
            datosPermitidos.puesto = datos.puesto;
        }

        if (datos.companyId !== undefined) {
            datosPermitidos.companyId = datos.companyId;
        }

        return await contactRepository.actualizar(
            contacto.id,
            datosPermitidos
        );

    }

    /**
     * Eliminación lógica de un contacto.
     *
     * @param {number} id
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async eliminar(id, usuario) {

        const contacto = await this.obtenerPorId(
            id,
            usuario
        );

        return await contactRepository.eliminar(
            contacto.id
        );

    }

}

module.exports = new ContactService();