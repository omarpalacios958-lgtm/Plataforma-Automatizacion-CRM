// ============================================
// Archivo: lead.service.js
// Descripción:
// Contiene la lógica de negocio del
// módulo de Leads.
// ============================================

const leadRepository = require("../repositories/lead.repository");
const leadValidation = require("../validations/lead.validation");
const contactRepository = require("../../contacts/repositories/contact.repository");
const automationExecutionService = require("../../automations/services/automation-execution.service");

class LeadService {

    /**
     * Obtiene todos los leads.
     *
     * Administrador:
     *      Puede consultar todos los leads.
     *
     * Vendedor:
     *      Sólo puede consultar sus propios leads.
     *
     * @param {Object} usuario
     */
    async obtenerTodos(usuario) {

        if (usuario.role === "Administrador") {

            return await leadRepository.obtenerTodos();

        }

        return await leadRepository.obtenerPorUsuario(
            usuario.id
        );

    }

    /**
     * Obtiene un lead por ID.
     *
     * Administrador:
     *      Puede consultar cualquier lead.
     *
     * Vendedor:
     *      Sólo puede consultar sus propios leads.
     *
     * @param {number} id
     * @param {Object} usuario
     */
    async obtenerPorId(id, usuario) {

        const lead = await leadRepository.obtenerPorId(id);

        if (!lead || !lead.activo) {

            throw new Error(
                "Lead no encontrado."
            );

        }

        if (usuario.role === "Administrador") {

            return lead;

        }

        if (lead.userId !== usuario.id) {

            throw new Error(
                "No tiene permisos para acceder a este lead."
            );

        }

        return lead;

    }

    /**
     * Crea un nuevo Lead y dispara el evento
     * correspondiente para las automatizaciones.
     *
     * @param {Object} datos
     * @param {Object} usuario
     */
    async crear(datos, usuario) {

        leadValidation.validarCrear(datos);

        // Verificar que el contacto exista y esté activo.
        const contacto = await contactRepository.obtenerPorId(
            Number(datos.contactId)
        );

        if (!contacto || !contacto.activo) {
            throw new Error(
                "El contacto no existe o está inactivo."
            );
        }

        // Verificar permisos sobre el contacto.
        if (
            usuario.role !== "Administrador" &&
            contacto.userId !== usuario.id
        ) {
            throw new Error(
                "No tiene permisos para utilizar este contacto."
            );
        }

        // Crear el prospecto.
        const lead = await leadRepository.crear({
            titulo: datos.titulo,
            descripcion: datos.descripcion,
            estado: datos.estado,
            origen: datos.origen,
            prioridad: datos.prioridad,
            valorEstimado: datos.valorEstimado,
            fechaSeguimiento: datos.fechaSeguimiento,
            contactId: Number(datos.contactId),
            userId: usuario.id
        });

        // Disparar la automatización sin comprometer
        // la creación del prospecto si ocurre un error.
        try {
            await automationExecutionService.procesarEvento({
                evento: "LEAD_CREADO",
                leadId: lead.id,
                userId: usuario.id,
                fechaEvento: lead.createdAt
            });
        } catch (error) {
            console.error(
                `Error al procesar automatizaciones del lead ${lead.id}:`,
                error.message
            );
        }

        // Mantener el contrato actual del servicio.
        return lead;

    }

    /**
     * Actualiza un Lead.
     *
     * @param {number} id
     * @param {Object} datos
     * @param {Object} usuario
     */
    async actualizar(id, datos, usuario) {

        const lead = await this.obtenerPorId(
            id,
            usuario
        );

        leadValidation.validarActualizar(datos);

        // ========================================
        // Si se cambia el contacto, validar
        // existencia, estado y permisos.
        // ========================================

        if (datos.contactId !== undefined) {

            const contacto = await contactRepository.obtenerPorId(
                Number(datos.contactId)
            );

            if (!contacto || !contacto.activo) {

                throw new Error(
                    "El contacto no existe o está inactivo."
                );

            }

            if (
                usuario.role !== "Administrador" &&
                contacto.userId !== usuario.id
            ) {

                throw new Error(
                    "No tiene permisos para utilizar este contacto."
                );

            }

        }

        // ========================================
        // Lista blanca de campos permitidos.
        //
        // userId y activo NO pueden modificarse
        // mediante esta operación.
        // ========================================

        const datosPermitidos = {};

        if (datos.titulo !== undefined) {

            datosPermitidos.titulo = datos.titulo;

        }

        if (datos.descripcion !== undefined) {

            datosPermitidos.descripcion = datos.descripcion;

        }

        if (datos.estado !== undefined) {

            datosPermitidos.estado = datos.estado;

        }

        if (datos.origen !== undefined) {

            datosPermitidos.origen = datos.origen;

        }

        if (datos.prioridad !== undefined) {

            datosPermitidos.prioridad = datos.prioridad;

        }

        if (datos.valorEstimado !== undefined) {

            datosPermitidos.valorEstimado =
                datos.valorEstimado;

        }

        if (datos.fechaSeguimiento !== undefined) {

            datosPermitidos.fechaSeguimiento =
                datos.fechaSeguimiento;

        }

        if (datos.contactId !== undefined) {

            datosPermitidos.contactId =
                Number(datos.contactId);

        }

        return await leadRepository.actualizar(
            lead.id,
            datosPermitidos
        );

    }

    /**
     * Eliminación lógica.
     *
     * @param {number} id
     * @param {Object} usuario
     */
    async eliminar(id, usuario) {

        const lead = await this.obtenerPorId(
            id,
            usuario
        );

        return await leadRepository.eliminar(
            lead.id
        );

    }

}

module.exports = new LeadService();