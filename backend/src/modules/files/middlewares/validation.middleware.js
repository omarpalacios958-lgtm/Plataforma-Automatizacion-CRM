// ============================================
// Archivo: validation.middleware.js
// Descripción:
// Middlewares de validación del módulo Files.
//
// Se encarga de:
// - Procesar errores de express-validator.
// - Validar asociaciones de archivos.
// - Validar existencia de entidades.
// - Determinar la entidad del archivo existente.
// - Manejar errores generados por Multer.
// ============================================

const { validationResult } = require("express-validator");
const multer = require("multer");
const fs = require("fs/promises");
const prisma = require("../../../config/database");

const validar = (req, res, next) => {
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Error de validación.",
            errors: errores.array()
        });
    }

    next();
};

const validarIdArchivo = (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: "El ID del archivo no es válido."
        });
    }

    next();
};

const limpiarArchivoSubidoSiFalla = (req, res, next) => {
    res.on("finish", async () => {
        if (res.statusCode < 400 || !req.file?.path) {
            return;
        }

        try {
            await fs.unlink(req.file.path);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error(
                    "No se pudo eliminar el archivo físico después del error:",
                    error.message
                );
            }
        }
    });

    next();
};

const validarAsociacionArchivo = (req, res, next) => {
    const asociaciones = [
        req.body.companyId,
        req.body.contactId,
        req.body.leadId,
        req.body.opportunityId
    ];

    const asociacionesValidas = asociaciones.filter(
        valor => valor !== undefined && valor !== null && valor !== ""
    );

    if (asociacionesValidas.length !== 1) {
        return res.status(400).json({
            success: false,
            message:
                "El archivo debe estar asociado exactamente a una entidad: Company, Contact, Lead u Opportunity."
        });
    }

    next();
};

const validarExistenciaEntidad = async (req, res, next) => {
    try {
        if (req.body.companyId) {
            const company = await prisma.company.findFirst({
                where: {
                    id: Number(req.body.companyId),
                    activo: true
                }
            });

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: "La Company asociada no existe o está inactiva."
                });
            }
        } else if (req.body.contactId) {
            const contact = await prisma.contact.findFirst({
                where: {
                    id: Number(req.body.contactId),
                    activo: true
                }
            });

            if (!contact) {
                return res.status(404).json({
                    success: false,
                    message: "El Contact asociado no existe o está inactivo."
                });
            }
        } else if (req.body.leadId) {
            const lead = await prisma.lead.findFirst({
                where: {
                    id: Number(req.body.leadId),
                    activo: true
                }
            });

            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: "El Lead asociado no existe o está inactivo."
                });
            }
        } else if (req.body.opportunityId) {
            const opportunity = await prisma.opportunity.findFirst({
                where: {
                    id: Number(req.body.opportunityId),
                    activo: true
                }
            });

            if (!opportunity) {
                return res.status(404).json({
                    success: false,
                    message:
                        "La Opportunity asociada no existe o está inactiva."
                });
            }
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error al validar la existencia de la entidad asociada."
        });
    }
};

const validarExistenciaEntidadActualizacion = async (req, res, next) => {
    try {
        if (req.body.companyId) {
            const company = await prisma.company.findFirst({
                where: {
                    id: Number(req.body.companyId),
                    activo: true
                }
            });

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: "La Company asociada no existe o está inactiva."
                });
            }
        }

        if (req.body.contactId) {
            const contact = await prisma.contact.findFirst({
                where: {
                    id: Number(req.body.contactId),
                    activo: true
                }
            });

            if (!contact) {
                return res.status(404).json({
                    success: false,
                    message: "El Contact asociado no existe o está inactivo."
                });
            }
        }

        if (req.body.leadId) {
            const lead = await prisma.lead.findFirst({
                where: {
                    id: Number(req.body.leadId),
                    activo: true
                }
            });

            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: "El Lead asociado no existe o está inactivo."
                });
            }
        }

        if (req.body.opportunityId) {
            const opportunity = await prisma.opportunity.findFirst({
                where: {
                    id: Number(req.body.opportunityId),
                    activo: true
                }
            });

            if (!opportunity) {
                return res.status(404).json({
                    success: false,
                    message:
                        "La Opportunity asociada no existe o está inactiva."
                });
            }
        }

        next();
    } catch (error) {
        console.error(
            "ERROR validarExistenciaEntidadActualizacion:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Error al validar la existencia de la entidad asociada."
        });
    }
};

const determinarEntidadArchivo = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "El ID del archivo no es válido."
            });
        }

        const archivo = await prisma.file.findFirst({
            where: {
                id,
                activo: true
            }
        });

        if (!archivo) {
            return res.status(404).json({
                success: false,
                message: "El archivo no existe o ya fue eliminado."
            });
        }

        if (
            req.user.role !== "Administrador" &&
            archivo.userId !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                message: "No tiene permisos para modificar este archivo."
            });
        }

        if (archivo.companyId) {
            req.fileEntity = "companies";
        } else if (archivo.contactId) {
            req.fileEntity = "contacts";
        } else if (archivo.leadId) {
            req.fileEntity = "leads";
        } else if (archivo.opportunityId) {
            req.fileEntity = "opportunities";
        } else {
            return res.status(400).json({
                success: false,
                message: "El archivo no tiene una entidad asociada válida."
            });
        }

        req.archivoExistente = archivo;

        next();
    } catch (error) {
        console.error("ERROR determinarEntidadArchivo:", error);

        return res.status(500).json({
            success: false,
            message: "Error al determinar la entidad del archivo."
        });
    }
};

const manejarErroresMulter = (error, req, res, next) => {
    if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
    ) {
        return res.status(400).json({
            success: false,
            message: "El archivo supera el tamaño máximo permitido de 10 MB."
        });
    }

    if (error.code === "INVALID_FILE_TYPE") {
        return res.status(400).json({
            success: false,
            message:
                "Tipo de archivo no permitido. Solo se permiten PDF, JPG, JPEG, PNG, DOC, DOCX, XLS y XLSX."
        });
    }

    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: "Error al procesar el archivo: " + error.message
        });
    }

    next(error);
};

module.exports = {
    validar,
    validarIdArchivo,
    limpiarArchivoSubidoSiFalla,
    validarAsociacionArchivo,
    validarExistenciaEntidad,
    validarExistenciaEntidadActualizacion,
    determinarEntidadArchivo,
    manejarErroresMulter
};