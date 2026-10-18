// ============================================
// Archivo: jwt.js
// Descripción:
// Utilidades para generar y verificar
// JSON Web Tokens.
// ============================================

const jwt = require("jsonwebtoken");

/**
 * Genera un token JWT.
 *
 * @param {Object} payload
 * @returns {string}
 */
function generarToken(payload) {

    return jwt.sign(

        payload,

        process.env.JWT_SECRET,

        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }

    );

}

/**
 * Verifica un token JWT.
 *
 * @param {string} token
 * @returns {Object}
 */
function verificarToken(token) {

    return jwt.verify(

        token,

        process.env.JWT_SECRET

    );

}

module.exports = {

    generarToken,

    verificarToken

};