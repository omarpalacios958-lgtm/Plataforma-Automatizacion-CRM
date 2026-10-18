// ============================================
// Archivo: multer.js
// Descripción:
// Configuración central de Multer.
// Gestiona el almacenamiento físico de
// archivos dentro del proyecto CRM.
// ============================================

const multer = require("multer");
const path = require("path");

// ============================================
// Configuración del almacenamiento
// ============================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        const entity = req.fileEntity || req.params.entity;

        const allowedEntities = [
            "companies",
            "contacts",
            "leads",
            "opportunities"
        ];

        if (!allowedEntities.includes(entity)) {

            return cb(
                new Error("Entidad no válida para almacenar archivos.")
            );

        }

        const uploadPath = path.join(
            __dirname,
            "../../uploads",
            entity
        );

        cb(null, uploadPath);

    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

// ============================================
// Filtro de archivos permitidos
// ============================================

const fileFilter = (req, file, cb) => {

    const allowedMimeTypes = [

        "application/pdf",

        "image/jpeg",

        "image/png",

        "application/msword",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        "application/vnd.ms-excel",

        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    ];

    const allowedExtensions = [

        ".pdf",

        ".jpg",

        ".jpeg",

        ".png",

        ".doc",

        ".docx",

        ".xls",

        ".xlsx"

    ];

    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    const mimeType = file.mimetype;

    // ========================================
    // Validar extensión y tipo MIME
    // ========================================

    if (
        !allowedExtensions.includes(extension) ||
        !allowedMimeTypes.includes(mimeType)
    ) {

        const error = new Error(
            "Tipo de archivo no permitido. Solo se permiten PDF, JPG, JPEG, PNG, DOC, DOCX, XLS y XLSX."
        );
        error.code = "INVALID_FILE_TYPE";
        return cb(error);

    }

    // ========================================
    // Archivo permitido
    // ========================================

    cb(null, true);

};

// ============================================

const upload = multer({

    storage,

    fileFilter,

    limits: {

        fileSize: 10 * 1024 * 1024

    }

});

// ============================================

module.exports = upload;