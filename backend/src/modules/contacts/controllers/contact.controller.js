// ============================================
// Archivo: contact.controller.js
// Descripción:
// Controlador del módulo de contactos.
// Gestiona las solicitudes HTTP y delega
// la lógica de negocio al Service.
// ============================================

const contactService = require("../services/contact.service");

class ContactController {

    /**
     * Obtiene todos los contactos.
     */
    async obtenerTodos(req, res) {

        try {

            const contactos = await contactService.obtenerTodos(req.user);

            return res.status(200).json({

                success: true,
                data: contactos

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Obtiene un contacto por ID.
     */
    async obtenerPorId(req, res) {

        try {

            const id = Number(req.params.id);

            const contacto = await contactService.obtenerPorId(id, req.user);

            return res.status(200).json({

                success: true,
                data: contacto

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Crea un nuevo contacto.
     */
    async crear(req, res) {

        try {

            const contacto = await contactService.crear(

                req.body,
                req.user

            );

            return res.status(201).json({

                success: true,
                message: "Contacto creado correctamente.",
                data: contacto

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

    /**
     * Actualiza un contacto.
     */
    async actualizar(req, res) {

        try {

            const id = Number(req.params.id);

            const contacto = await contactService.actualizar(

                id,
                req.body,
                req.user

            );

            return res.status(200).json({

                success: true,
                message: "Contacto actualizado correctamente.",
                data: contacto

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

            const id = Number(req.params.id);

            await contactService.eliminar(id, req.user);

            return res.status(200).json({

                success: true,
                message: "Contacto eliminado correctamente."

            });

        } catch (error) {

            return res.status(400).json({

                success: false,
                message: error.message

            });

        }

    }

}

module.exports = new ContactController();