// ============================================
// Archivo: activity.controller.js
// Descripción:
// Controlador del módulo de Actividades.
// Atiende las peticiones HTTP y delega
// la lógica de negocio al Service.
// ============================================

const activityService = require("../services/activity.service");

class ActivityController {

    /**
     * Obtener todas las actividades.
     */
    async obtenerTodos(req, res) {

        try {

            const activities = await activityService.obtenerTodos(
                req.user
            );

            return res.status(200).json({

                success: true,
                data: activities

            });

        } catch (error) {

            return res.status(500).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Obtener una actividad por ID.
     */
    async obtenerPorId(req, res) {

        try {

            const { id } = req.params;

            const activity = await activityService.obtenerPorId(
                Number(id),
                req.user
            );

            return res.status(200).json({

                success: true,
                data: activity

            });

        } catch (error) {

            return res.status(404).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Crear una nueva actividad.
     */
    async crear(req, res) {

        try {

            const activity = await activityService.crear(
                req.body,
                req.user
            );

            return res.status(201).json({

                success: true,
                message: "Actividad creada correctamente.",
                data: activity

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Actualizar una actividad.
     */
    async actualizar(req, res) {

        try {

            const { id } = req.params;

            const activity = await activityService.actualizar(

                Number(id),
                req.body,
                req.user

            );

            return res.status(200).json({

                success: true,
                message: "Actividad actualizada correctamente.",
                data: activity

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

            await activityService.eliminar(

                Number(id),
                req.user

            );

            return res.status(200).json({

                success: true,
                message: "Actividad eliminada correctamente."

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

}

module.exports = new ActivityController();