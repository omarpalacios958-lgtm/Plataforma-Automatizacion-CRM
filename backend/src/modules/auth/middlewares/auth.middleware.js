// ============================================
// Archivo: auth.middleware.js
// Descripción:
// Middleware encargado de validar el JWT
// enviado por el cliente.
// ============================================

const { verificarToken } = require("../../../utils/jwt");

function authMiddleware(req, res, next) {

    try {

        // Obtener encabezado Authorization
        const authorization = req.headers.authorization;

        // Verificar existencia
        if (!authorization) {

            return res.status(401).json({

                success: false,
                message: "Token no proporcionado."

            });

        }

        // Formato esperado:
        // Authorization: Bearer TOKEN

        const partes = authorization.split(" ");

        if (partes.length !== 2 || partes[0] !== "Bearer") {

            return res.status(401).json({

                success: false,
                message: "Formato de token inválido."

            });

        }

        const token = partes[1];

        // Verificar JWT
        const payload = verificarToken(token);

        // Guardar información del usuario
        req.user = payload;

        next();

    } catch (error) {

        return res.status(401).json({

            success: false,
            message: "Token inválido o expirado."

        });

    }

}

module.exports = authMiddleware;