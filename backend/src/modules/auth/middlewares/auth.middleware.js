
const { verificarToken } = require("../../../utils/jwt");
const userRepository = require("../../users/repositories/user.repository");

async function authMiddleware(req, res, next) {
    // Validar el encabezado Authorization.
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            success: false,
            message: "Token no proporcionado."
        });
    }

    const partes = authorization.split(" ");

    if (
        partes.length !== 2 ||
        partes[0] !== "Bearer" ||
        !partes[1]
    ) {
        return res.status(401).json({
            success: false,
            message: "Formato de token inválido."
        });
    }

    let payload;

    try {
        payload = verificarToken(partes[1]);
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token inválido o expirado."
        });
    }

    // Validar que el token identifique a un empleado.
    const userId = Number(payload.id);

    if (
        !Number.isSafeInteger(userId) ||
        userId <= 0
    ) {
        return res.status(401).json({
            success: false,
            message: "Token inválido."
        });
    }

    try {
        // Consultar el estado actual del empleado.
        const usuario = await userRepository.obtenerPorId(userId);

        if (!usuario || !usuario.activo || !usuario.role) {
            return res.status(401).json({
                success: false,
                message: "Usuario no autorizado o inactivo."
            });
        }

        // Utilizar el rol actual de PostgreSQL,
        // no el rol almacenado originalmente en el JWT.
        req.user = {
            id: usuario.id,
            correo: usuario.correo,
            role: usuario.role.nombre
        };

        return next();
    } catch (error) {
        console.error(
            "Error al validar el usuario autenticado:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "No fue posible validar la autenticación."
        });
    }
}

module.exports = authMiddleware;
