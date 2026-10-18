// ============================================
// Archivo: activity.service.js
// Descripción:
// Contiene la lógica de negocio del
// módulo de Actividades.
// ============================================

const activityRepository = require("../repositories/activity.repository");
const activityValidation = require("../validations/activity.validation");
const opportunityRepository = require("../../opportunities/repositories/opportunity.repository");

class ActivityService {

    /**
     * Obtiene todas las actividades.
     *
     * Administrador:
     * - Puede consultar todas las actividades activas.
     *
     * Vendedor:
     * - Solo puede consultar sus propias actividades.
     *
     * @param {Object} usuario
     */
    async obtenerTodos(usuario) {

        if (usuario.role === "Administrador") {

            return await activityRepository.obtenerTodos();

        }

        return await activityRepository.obtenerPorUsuario(
            usuario.id
        );

    }

    /**
     * Obtiene una actividad por ID.
     *
     * @param {number} id
     * @param {Object} usuario
     */
    async obtenerPorId(id, usuario) {

        const activity = await activityRepository.obtenerPorId(id);

        if (!activity || !activity.activo) {

            throw new Error(
                "Actividad no encontrada."
            );

        }

        // Administrador puede acceder a cualquier actividad.
        if (usuario.role === "Administrador") {

            return activity;

        }

        // Los demás usuarios solo pueden acceder
        // a actividades de su propiedad.
        if (activity.userId !== usuario.id) {

            throw new Error(
                "No tiene permisos para acceder a esta actividad."
            );

        }

        return activity;

    }

    /**
     * Crea una nueva actividad.
     *
     * @param {Object} datos
     * @param {Object} usuario
     */
    async crear(datos, usuario) {

        activityValidation.validarCrear(datos);

        const opportunity = await opportunityRepository.obtenerPorId(
            Number(datos.opportunityId)
        );

        if (!opportunity || !opportunity.activo) {

            throw new Error(
                "La oportunidad no existe o está inactiva."
            );

        }

        // Un Vendedor solamente puede crear actividades
        // sobre oportunidades que le pertenecen.
        if (
            usuario.role !== "Administrador" &&
            opportunity.userId !== usuario.id
        ) {

            throw new Error(
                "No tiene permisos para utilizar esta oportunidad."
            );

        }

        // Solo permitimos los campos correspondientes
        // a una actividad.
        const datosPermitidos = {

            tipo: datos.tipo,
            asunto: datos.asunto,
            descripcion: datos.descripcion,
            fechaActividad: datos.fechaActividad,
            estado: datos.estado,
            opportunityId: Number(datos.opportunityId),

            // El propietario siempre viene del usuario autenticado.
            userId: usuario.id

        };

        return await activityRepository.crear(
            datosPermitidos
        );

    }

    /**
     * Actualiza una actividad.
     *
     * @param {number} id
     * @param {Object} datos
     * @param {Object} usuario
     */
    async actualizar(id, datos, usuario) {

        // Primero comprobamos que exista y que
        // el usuario tenga acceso.
        const activity = await this.obtenerPorId(
            id,
            usuario
        );

        activityValidation.validarActualizar(datos);

        // Si se intenta cambiar la oportunidad,
        // debemos comprobar que sea válida y accesible.
        if (datos.opportunityId !== undefined) {

            const opportunity = await opportunityRepository.obtenerPorId(
                Number(datos.opportunityId)
            );

            if (!opportunity || !opportunity.activo) {

                throw new Error(
                    "La oportunidad no existe o está inactiva."
                );

            }

            if (
                usuario.role !== "Administrador" &&
                opportunity.userId !== usuario.id
            ) {

                throw new Error(
                    "No tiene permisos para utilizar esta oportunidad."
                );

            }

        }

        const datosPermitidos = {};

        if (datos.tipo !== undefined) {

            datosPermitidos.tipo = datos.tipo;

        }

        if (datos.asunto !== undefined) {

            datosPermitidos.asunto = datos.asunto;

        }

        if (datos.descripcion !== undefined) {

            datosPermitidos.descripcion = datos.descripcion;

        }

        if (datos.fechaActividad !== undefined) {

            datosPermitidos.fechaActividad =
                datos.fechaActividad;

        }

        if (datos.estado !== undefined) {

            datosPermitidos.estado = datos.estado;

        }

        if (datos.opportunityId !== undefined) {

            datosPermitidos.opportunityId =
                Number(datos.opportunityId);

        }

        return await activityRepository.actualizar(

            id,
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

        await this.obtenerPorId(
            id,
            usuario
        );

        return await activityRepository.eliminar(id);

    }

}

module.exports = new ActivityService();