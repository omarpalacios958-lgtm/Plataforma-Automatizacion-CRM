// ============================================
// Archivo: validation.middleware.js
// Descripción:
// Procesa los errores generados por
// express-validator.
// ============================================

const { validationResult } = require("express-validator");

const validationMiddleware = (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        return res.status(400).json({

            success: false,
            errors: errors.array()

        });

    }

    next();

};

module.exports = validationMiddleware;