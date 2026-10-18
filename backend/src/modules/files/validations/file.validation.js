// ============================================
// Archivo: file.validation.js
// Descripción:
// Validaciones del módulo Files.
// Se encarga de validar la información
// necesaria para registrar y actualizar
// archivos en el sistema.
// ============================================

const { body } = require("express-validator");
const { validar } = require("../middlewares/validation.middleware");

const validarCrearArchivo = [
    body("nombre")
        .isString()
        .withMessage("El nombre del archivo debe ser texto.")
        .trim()
        .notEmpty()
        .withMessage("El nombre del archivo es obligatorio.")
        .isLength({ max: 150 })
        .withMessage("El nombre del archivo no puede superar los 150 caracteres."),

    body("companyId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("El companyId debe ser un ID válido."),

    body("contactId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("El contactId debe ser un ID válido."),

    body("leadId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("El leadId debe ser un ID válido."),

    body("opportunityId")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("El opportunityId debe ser un ID válido."),

    body().custom((datos, { req }) => {
        const cuerpo = datos || req.body || {};

        const asociaciones = [
            cuerpo.companyId,
            cuerpo.contactId,
            cuerpo.leadId,
            cuerpo.opportunityId
        ].filter(
            valor =>
                valor !== undefined &&
                valor !== null &&
                valor !== ""
        );

        if (asociaciones.length > 1) {
            throw new Error(
                "El archivo solo puede asociarse a una entidad."
            );
        }

        if (asociaciones.length === 0) {
            throw new Error(
                "El archivo debe asociarse a una entidad."
            );
        }

        return true;
    }),

    validar
];

const validarActualizarArchivo = [
    body("nombre")
        .optional()
        .isString()
        .withMessage("El nombre debe ser texto.")
        .trim()
        .notEmpty()
        .withMessage("El nombre no puede estar vacío.")
        .isLength({ max: 150 })
        .withMessage("El nombre no puede superar los 150 caracteres."),

    body("companyId")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("El companyId debe ser un ID válido."),

    body("contactId")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("El contactId debe ser un ID válido."),

    body("leadId")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("El leadId debe ser un ID válido."),

    body("opportunityId")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("El opportunityId debe ser un ID válido."),

    body("userId")
        .not()
        .exists()
        .withMessage("El userId no puede modificarse."),

    body("activo")
        .not()
        .exists()
        .withMessage("El estado activo no puede modificarse directamente."),

    body("ruta")
        .not()
        .exists()
        .withMessage("La ruta del archivo no puede modificarse directamente."),

    body("nombreOriginal")
        .not()
        .exists()
        .withMessage("El nombre original no puede modificarse directamente."),

    body("tipoMime")
        .not()
        .exists()
        .withMessage("El tipo MIME no puede modificarse directamente."),

    body("extension")
        .not()
        .exists()
        .withMessage("La extensión no puede modificarse directamente."),

    body("tamano")
        .not()
        .exists()
        .withMessage("El tamaño del archivo no puede modificarse directamente."),

    body().custom((datos, { req }) => {
        const cuerpo = datos || req.body || {};

        const camposActualizables = [
            "nombre",
            "companyId",
            "contactId",
            "leadId",
            "opportunityId"
        ];

        const tieneCamposActualizables = camposActualizables.some(
            campo => cuerpo[campo] !== undefined
        );

        if (tieneCamposActualizables || req.file) {
            return true;
        }

        throw new Error(
            "Debe proporcionar al menos un dato para actualizar."
        );
    }),

    validar
];

module.exports = {
    validarCrearArchivo,
    validarActualizarArchivo
};