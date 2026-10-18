// ============================================
// Archivo: user.controller.js
// Descripción:
// Controlador del módulo de usuarios.
// Se encarga de recibir las peticiones HTTP
// y delegar la lógica de negocio al Service.
// ============================================

const userService = require("../services/user.service");

class UserController {

    /**
     * Obtiene todos los usuarios activos.
     */
    async obtenerTodos(req, res) {

        try {

            const respuesta = await userService.obtenerTodos();

            return res.status(200).json(respuesta);

        } catch (error) {

            return res.status(500).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Obtiene un usuario por su ID.
     */
    async obtenerPorId(req, res) {

        try {

            const respuesta = await userService.obtenerPorId(

                Number(req.params.id)

            );

            return res.status(200).json(respuesta);

        } catch (error) {

            return res.status(404).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Crea un nuevo usuario.
     *
     * @param {Object} req
     * @param {Object} res
     */
    async crear(req, res) {

        try {

            const respuesta = await userService.crear(req.body);

            return res.status(201).json(respuesta);

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Actualiza un usuario.
     *
     * @param {Object} req
     * @param {Object} res
     */
    async actualizar(req, res) {

        try {

            const respuesta = await userService.actualizar(

                Number(req.params.id),

                req.body

            );

            return res.status(200).json(respuesta);

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Realiza la eliminación lógica de un usuario.
     *
     * @param {Object} req
     * @param {Object} res
     */
    async eliminar(req, res) {

        try {

            const respuesta = await userService.eliminar(

                Number(req.params.id)

            );

            return res.status(200).json(respuesta);

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

}

module.exports = new UserController();