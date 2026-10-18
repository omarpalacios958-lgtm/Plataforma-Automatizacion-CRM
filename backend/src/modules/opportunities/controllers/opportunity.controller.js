// ============================================
// Archivo: opportunity.controller.js
// Descripción:
// Controlador del módulo de Oportunidades.
// Atiende las peticiones HTTP y delega
// la lógica de negocio al Service.
// ============================================

const opportunityService = require("../services/opportunity.service");

class OpportunityController {

    /**
     * Obtener todas las oportunidades.
     */
    async obtenerTodos(req, res) {

        try {

            const opportunities =
                await opportunityService.obtenerTodos(req.user);

            return res.status(200).json({

                success: true,
                data: opportunities

            });

        } catch (error) {

            return res.status(500).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Obtener una oportunidad por ID.
     */
    async obtenerPorId(req, res) {

        try {

            const { id } = req.params;

            const opportunity =
                await opportunityService.obtenerPorId(
                    Number(id),
                    req.user
                );

            return res.status(200).json({

                success: true,
                data: opportunity

            });

        } catch (error) {

            return res.status(404).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Crear una nueva oportunidad.
     */
    async crear(req, res) {

        try {

            const opportunity =
                await opportunityService.crear(
                    req.body,
                    req.user
                );

            return res.status(201).json({

                success: true,
                message: "Oportunidad creada correctamente.",
                data: opportunity

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Actualizar una oportunidad.
     */
    async actualizar(req, res) {

        try {

            const { id } = req.params;

            const opportunity =
                await opportunityService.actualizar(
                    Number(id),
                    req.body,
                    req.user
                );

            return res.status(200).json({

                success: true,
                message: "Oportunidad actualizada correctamente.",
                data: opportunity

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

            await opportunityService.eliminar(
                Number(id),
                req.user
            );

            return res.status(200).json({

                success: true,
                message: "Oportunidad eliminada correctamente."

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

}

module.exports = new OpportunityController();