// ============================================
// Archivo: notification.service.js
// Descripción:
// Contiene la lógica de negocio del
// módulo de Notificaciones.
// ============================================

const notificationRepository = require("../repositories/notification.repository");
const notificationValidation = require("../validations/notification.validation");

class NotificationService {

    /**
     * Obtiene las notificaciones según el rol
     * del usuario autenticado.
     *
     * Administrador:
     * - Puede consultar todas las notificaciones activas.
     *
     * Vendedor:
     * - Solo puede consultar sus propias notificaciones.
     *
     * @param {Object} usuario
     */
    async obtenerTodos(usuario) {

        if (usuario.role === "Administrador") {

            return await notificationRepository.obtenerTodos();

        }

        return await notificationRepository.obtenerPorUsuario(
            usuario.id
        );

    }

    /**
     * Obtiene una notificación por ID.
     *
     * Administrador:
     * - Puede acceder a cualquier notificación activa.
     *
     * Vendedor:
     * - Solo puede acceder a sus propias notificaciones.
     *
     * @param {number} id
     * @param {Object} usuario
     */
    async obtenerPorId(id, usuario) {

        const notification =
            await notificationRepository.obtenerPorId(id);

        if (!notification || !notification.activo) {

            throw new Error("Notificación no encontrada.");

        }

        if (usuario.role === "Administrador") {

            return notification;

        }

        if (notification.userId !== usuario.id) {

            throw new Error(
                "No tiene permisos para acceder a esta notificación."
            );

        }

        return notification;

    }

    /**
     * Crea una nueva notificación.
     *
     * El userId se obtiene del usuario autenticado.
     * El cliente no puede decidir el propietario.
     *
     * @param {Object} datos
     * @param {Object} usuario
     */
    async crear(datos, usuario) {

        notificationValidation.validarCrear(datos);

        const datosPermitidos = {

            titulo: datos.titulo,
            mensaje: datos.mensaje,
            tipo: datos.tipo,
            leida: datos.leida !== undefined
                ? datos.leida
                : false,
            userId: usuario.id

        };

        return await notificationRepository.crear(
            datosPermitidos
        );

    }

    /**
     * Actualiza una notificación.
     *
     * Solo se permiten modificar los campos
     * autorizados.
     *
     * @param {number} id
     * @param {Object} datos
     * @param {Object} usuario
     */
    async actualizar(id, datos, usuario) {

        await this.obtenerPorId(id, usuario);

        notificationValidation.validarActualizar(datos);

        const datosPermitidos = {};

        if (datos.titulo !== undefined) {

            datosPermitidos.titulo = datos.titulo;

        }

        if (datos.mensaje !== undefined) {

            datosPermitidos.mensaje = datos.mensaje;

        }

        if (datos.tipo !== undefined) {

            datosPermitidos.tipo = datos.tipo;

        }

        if (datos.leida !== undefined) {

            datosPermitidos.leida = datos.leida;

        }

        return await notificationRepository.actualizar(
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

        await this.obtenerPorId(id, usuario);

        return await notificationRepository.eliminar(id);

    }

}

module.exports = new NotificationService();