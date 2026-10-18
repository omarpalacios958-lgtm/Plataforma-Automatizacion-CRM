// ============================================
// Archivo: task.controller.js
// Descripción:
// Controlador del módulo de Tareas.
// Atiende las peticiones HTTP y delega
// la lógica de negocio al Service.
// ============================================

const taskService = require("../services/task.service");

class TaskController {

    /**
     * Obtener todas las tareas.
     */
    async obtenerTodos(req, res) {

        try {

            const tasks = await taskService.obtenerTodos(req.user);

            return res.status(200).json({

                success: true,
                data: tasks

            });

        } catch (error) {

            return res.status(500).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Obtener una tarea por ID.
     */
    async obtenerPorId(req, res) {

        try {

            const { id } = req.params;

            const task = await taskService.obtenerPorId(
                Number(id),
                req.user
            );

            return res.status(200).json({

                success: true,
                data: task

            });

        } catch (error) {

            return res.status(404).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Crear una nueva tarea.
     */
    async crear(req, res) {

        try {

            const task = await taskService.crear(
                req.body,
                req.user
            );

            return res.status(201).json({

                success: true,
                message: "Tarea creada correctamente.",
                data: task

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Actualizar una tarea.
     */
    async actualizar(req, res) {

        try {

            const { id } = req.params;

            const task = await taskService.actualizar(
                Number(id),
                req.body,
                req.user
            );

            return res.status(200).json({

                success: true,
                message: "Tarea actualizada correctamente.",
                data: task

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

            await taskService.eliminar(
                Number(id),
                req.user
            );

            return res.status(200).json({

                success: true,
                message: "Tarea eliminada correctamente."

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

}

module.exports = new TaskController();