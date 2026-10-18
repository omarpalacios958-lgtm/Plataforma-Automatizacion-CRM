// ============================================
// Archivo: company.validation.js
// Descripción:
// Validaciones del módulo de empresas.
// Se utiliza express-validator para validar
// los datos enviados por el cliente.
// ============================================

const { body } = require("express-validator");

// ============================================
// Validación para crear empresa
// ============================================

const validarCrearEmpresa = [

    body("nombre")
        .notEmpty()
        .withMessage("El nombre es obligatorio.")
        .isLength({ max: 100 })
        .withMessage("El nombre no puede exceder los 100 caracteres."),

    body("razonSocial")
        .optional()
        .isLength({ max: 150 })
        .withMessage("La razón social no puede exceder los 150 caracteres."),

    body("rfc")
        .optional()
        .isLength({ max: 20 })
        .withMessage("El RFC no puede exceder los 20 caracteres."),

    body("industria")
        .optional()
        .isLength({ max: 100 })
        .withMessage("La industria no puede exceder los 100 caracteres."),

    body("sitioWeb")
        .optional()
        .isURL()
        .withMessage("El sitio web debe ser una URL válida."),

    body("telefono")
        .optional()
        .isLength({ max: 20 })
        .withMessage("El teléfono no puede exceder los 20 caracteres."),

    body("direccion")
        .optional()
        .isLength({ max: 255 })
        .withMessage("La dirección no puede exceder los 255 caracteres.")

];

// ============================================
// Validación para actualizar empresa
// ============================================

const validarActualizarEmpresa = [

    body("nombre")
        .optional()
        .isLength({ max: 100 })
        .withMessage("El nombre no puede exceder los 100 caracteres."),

    body("razonSocial")
        .optional()
        .isLength({ max: 150 })
        .withMessage("La razón social no puede exceder los 150 caracteres."),

    body("rfc")
        .optional()
        .isLength({ max: 20 })
        .withMessage("El RFC no puede exceder los 20 caracteres."),

    body("industria")
        .optional()
        .isLength({ max: 100 })
        .withMessage("La industria no puede exceder los 100 caracteres."),

    body("sitioWeb")
        .optional()
        .isURL()
        .withMessage("El sitio web debe ser una URL válida."),

    body("telefono")
        .optional()
        .isLength({ max: 20 })
        .withMessage("El teléfono no puede exceder los 20 caracteres."),

    body("direccion")
        .optional()
        .isLength({ max: 255 })
        .withMessage("La dirección no puede exceder los 255 caracteres.")

];

module.exports = {
    validarCrearEmpresa,
    validarActualizarEmpresa
};