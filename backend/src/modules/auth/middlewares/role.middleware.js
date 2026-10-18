// ============================================
// Archivo: role.middleware.js
// Descripción:
// Middleware encargado de verificar que el
// usuario autenticado tenga alguno de los
// roles autorizados para acceder al recurso.
// ============================================

/**
 * Middleware para validar roles.
 *
 * @param {...string} rolesPermitidos
 * @returns {Function}
 */
function roleMiddleware(...rolesPermitidos) {

    return (req, res, next) => {

        // Verificar que exista información del usuario
        if (!req.user) {

            return res.status(401).json({

                success: false,
                message: "Usuario no autenticado."

            });

        }

        // Verificar permisos
        if (!rolesPermitidos.includes(req.user.role)) {

            return res.status(403).json({

                success: false,
                message: "No tiene permisos para realizar esta acción."

            });

        }

        next();

    };

}

module.exports = roleMiddleware;