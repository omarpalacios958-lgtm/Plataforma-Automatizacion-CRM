// ============================================
// Archivo: file.controller.js
// Descripción:
// Controlador del módulo Files.
// Gestiona las peticiones HTTP y delega
// la lógica de negocio al Service.
// ============================================

const fileService = require("../services/file.service");

// ============================================
// Obtener todos los archivos
// ============================================

const obtenerTodos = async (req, res) => {

    try {

        const archivos =
            await fileService.obtenerTodos(req.user);

        return res.status(200).json({
            success: true,
            data: archivos
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ============================================
// Obtener archivo por ID
// ============================================

const obtenerPorId = async (req, res) => {

    try {

        const archivo =
            await fileService.obtenerPorId(
                Number(req.params.id),
                req.user
            );

        return res.status(200).json({
            success: true,
            data: archivo
        });

    } catch (error) {

        const statusCode =
            error.message.includes("permisos")
                ? 403
                : 404;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });

    }

};

// ============================================
// Crear / Subir archivo
// ============================================

const crear = async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "Debe seleccionar un archivo."
            });

        }

        const datosArchivo = {

            nombre: req.body.nombre,

            nombreOriginal:
                req.file.originalname,

            ruta:
                req.file.path,

            tipoMime:
                req.file.mimetype,

            extension:
                req.file.originalname
                    .split(".")
                    .pop()
                    .toLowerCase(),

            tamano:
                req.file.size,

            companyId:
                req.body.companyId
                    ? Number(req.body.companyId)
                    : null,

            contactId:
                req.body.contactId
                    ? Number(req.body.contactId)
                    : null,

            leadId:
                req.body.leadId
                    ? Number(req.body.leadId)
                    : null,

            opportunityId:
                req.body.opportunityId
                    ? Number(req.body.opportunityId)
                    : null

        };

        const archivo =
            await fileService.crear(
                datosArchivo,
                req.user
            );

        return res.status(201).json({
            success: true,
            message: "Archivo subido correctamente.",
            data: archivo
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ============================================
// Actualizar archivo
// ============================================

const actualizar = async (req, res) => {

    try {

        const id =
            Number(req.params.id);

        const datosActualizacion = {};

        // ========================================
        // Nombre personalizado
        // ========================================

        if (req.body.nombre !== undefined) {

            datosActualizacion.nombre =
                req.body.nombre;

        }

        // ========================================
        // Asociación
        //
        // Solo se incluyen si fueron enviados.
        // El Service validará los permisos.
        // ========================================

        if (req.body.companyId !== undefined) {

            datosActualizacion.companyId =
                req.body.companyId
                    ? Number(req.body.companyId)
                    : null;

        }

        if (req.body.contactId !== undefined) {

            datosActualizacion.contactId =
                req.body.contactId
                    ? Number(req.body.contactId)
                    : null;

        }

        if (req.body.leadId !== undefined) {

            datosActualizacion.leadId =
                req.body.leadId
                    ? Number(req.body.leadId)
                    : null;

        }

        if (req.body.opportunityId !== undefined) {

            datosActualizacion.opportunityId =
                req.body.opportunityId
                    ? Number(req.body.opportunityId)
                    : null;

        }

        // ========================================
        // Si se envió un nuevo archivo
        // ========================================

        if (req.file) {

            datosActualizacion.nombreOriginal =
                req.file.originalname;

            datosActualizacion.ruta =
                req.file.path;

            datosActualizacion.tipoMime =
                req.file.mimetype;

            datosActualizacion.extension =
                req.file.originalname
                    .split(".")
                    .pop()
                    .toLowerCase();

            datosActualizacion.tamano =
                req.file.size;

        }

        const archivo =
            await fileService.actualizar(
                id,
                datosActualizacion,
                req.user
            );

        return res.status(200).json({

            success: true,

            message:
                "Archivo actualizado correctamente.",

            data: archivo

        });

    } catch (error) {

        let statusCode = 500;

        if (error.message.includes("permisos")) {
            statusCode = 403;
        }

        else if (
            error.message.includes("no fue encontrado") ||
            error.message.includes("no existe")
        ) {
            statusCode = 404;
        }

        else if (
            error.message.includes("asociarse") ||
            error.message.includes("asociada")
        ) {
            statusCode = 400;
        }

        return res.status(statusCode).json({

            success: false,

            message: error.message

        });

    }

};

// ============================================
// Eliminación lógica
// ============================================

const eliminar = async (req, res) => {

    try {

        await fileService.eliminar(
            Number(req.params.id),
            req.user
        );

        return res.status(200).json({
            success: true,
            message: "Archivo eliminado correctamente."
        });

    } catch (error) {

        let statusCode = 500;

        if (error.message.includes("permisos")) {
            statusCode = 403;
        }

        else if (
            error.message.includes("no encontrado") ||
            error.message.includes("no existe")
        ) {
            statusCode = 404;
        }

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });

    }

};

// ============================================

module.exports = {

    obtenerTodos,

    obtenerPorId,

    crear,

    actualizar,

    eliminar

};