// ============================================
// Archivo: notification.controller.js
// Descripción:
// Controlador del módulo de Notificaciones.
// Atiende las peticiones HTTP y delega
// la lógica de negocio al Service.
// ============================================

const notificationService = require("../services/notification.service");

class NotificationController {

    /**
     * Obtiene todas las notificaciones
     * según el usuario autenticado.
     */
    async obtenerTodos(req, res) {

        try {

            const notifications = await notificationService.obtenerTodos(
                req.user
            );

            return res.status(200).json({

                success: true,
                data: notifications

            });

        } catch (error) {

            return res.status(500).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Obtiene una notificación por ID.
     */
    async obtenerPorId(req, res) {

        try {

            const { id } = req.params;

            const notification = await notificationService.obtenerPorId(
                Number(id),
                req.user
            );

            return res.status(200).json({

                success: true,
                data: notification

            });

        } catch (error) {

            return res.status(404).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Crea una nueva notificación.
     */
    async crear(req, res) {

        try {

            const notification = await notificationService.crear(
                req.body,
                req.user
            );

            return res.status(201).json({

                success: true,
                message: "Notificación creada correctamente.",
                data: notification

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Actualiza una notificación.
     */
    async actualizar(req, res) {

        try {

            const { id } = req.params;

            const notification = await notificationService.actualizar(
                Number(id),
                req.body,
                req.user
            );

            return res.status(200).json({

                success: true,
                message: "Notificación actualizada correctamente.",
                data: notification

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Eliminación lógica.
     */
    async eliminar(req, res) {

        try {

            const { id } = req.params;

            await notificationService.eliminar(
                Number(id),
                req.user
            );

            return res.status(200).json({

                success: true,
                message: "Notificación eliminada correctamente."

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

}

module.exports = new NotificationController();