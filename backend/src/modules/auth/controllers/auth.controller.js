// ============================================
// Archivo: auth.controller.js
// Descripción:
// Controlador del módulo de autenticación.
// ============================================

const authService = require("../services/auth.service");

class AuthController {

    async verificarEstado(req, res) {

    const respuesta = await authService.verificarEstado();

    return res.status(200).json(respuesta);

}

    /**
     * Registro de usuarios.
     */
    async register(req, res) {

        try {

            const respuesta = await authService.register(req.body);

            return res.status(201).json(respuesta);

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Inicio de sesión.
     */
    async login(req, res) {

        try {

            const respuesta = await authService.login(req.body);

            return res.status(200).json(respuesta);

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

}

module.exports = new AuthController();