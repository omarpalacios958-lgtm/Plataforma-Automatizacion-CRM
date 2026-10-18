// ============================================
// Archivo: lead.controller.js
// Descripción:
// Controlador del módulo de Leads.
// Atiende las peticiones HTTP y delega
// la lógica de negocio al Service.
// ============================================

const leadService = require("../services/lead.service");

class LeadController {

    /**
     * Obtener todos los leads.
     */
    async obtenerTodos(req, res) {

        try {

            const leads = await leadService.obtenerTodos(
                req.user
            );

            return res.status(200).json({

                success: true,
                data: leads

            });

        } catch (error) {

            return res.status(500).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Obtener un lead por ID.
     */
    async obtenerPorId(req, res) {

        try {

            const { id } = req.params;

            const lead = await leadService.obtenerPorId(
                Number(id),
                req.user
            );

            return res.status(200).json({

                success: true,
                data: lead

            });

        } catch (error) {

            return res.status(404).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Crear un nuevo lead.
     */
    async crear(req, res) {

        try {

            const lead = await leadService.crear(
                req.body,
                req.user
            );

            return res.status(201).json({

                success: true,
                message: "Lead creado correctamente.",
                data: lead

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Actualizar un lead.
     */
    async actualizar(req, res) {

        try {

            const { id } = req.params;

            const lead = await leadService.actualizar(

                Number(id),
                req.body,
                req.user

            );

            return res.status(200).json({

                success: true,
                message: "Lead actualizado correctamente.",
                data: lead

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

            await leadService.eliminar(
                Number(id),
                req.user
            );

            return res.status(200).json({

                success: true,
                message: "Lead eliminado correctamente."

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

}

module.exports = new LeadController();