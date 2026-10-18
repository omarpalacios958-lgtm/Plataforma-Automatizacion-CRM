
const automationService = require("../services/automation.service");

function clasificarError(error) {
    const mensaje = error?.message || "";
    const mensajeNormalizado = mensaje
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (mensajeNormalizado.includes("permisos")) {
        return 403;
    }

    if (mensajeNormalizado.includes("automatizacion no encontrada")) {
        return 404;
    }

    const erroresDeEntrada = [
        "id de la automatizacion no es valido",
        "nombre de la automatizacion",
        "descripcion debe",
        "descripcion no puede",
        "evento de la automatizacion",
        "campo activa debe",
        "acciones deben",
        "accion ",
        "tipo de accion",
        "configuracion de la accion",
        "campo activa de la accion",
        "orden de la accion",
        "titulo de la tarea",
        "descripcion de la tarea",
        "prioridad de la tarea",
        "estado de la tarea",
        "fecha limite de la tarea",
        "titulo de la notificacion",
        "mensaje de la notificacion",
        "tipo de notificacion",
        "destinatario del correo",
        "destinatario debe ser",
        "asunto del correo",
        "mensaje del correo",
        "datos de la automatizacion",
        "datos de actualizacion",
        "campos no permitidos",
        "debe proporcionar al menos un campo",
        "no se pueden modificar las acciones"
    ];

    if (
        erroresDeEntrada.some((fragmento) =>
            mensajeNormalizado.includes(fragmento)
        )
    ) {
        return 400;
    }

    return 500;
}

function responderError(res, error) {
    const status = clasificarError(error);

    return res.status(status).json({
        success: false,
        message: status === 500
            ? "Error interno del servidor."
            : error.message
    });
}

class AutomationController {
    async obtenerTodos(req, res) {
        try {
            const data = await automationService.obtenerTodos(req.user);

            return res.status(200).json({ success: true, data });
        } catch (error) {
            return responderError(res, error);
        }
    }

    async obtenerPorId(req, res) {
        try {
            const id = Number(req.params.id);
            const data = await automationService.obtenerPorId(id, req.user);

            return res.status(200).json({ success: true, data });
        } catch (error) {
            return responderError(res, error);
        }
    }

    async crear(req, res) {
        try {
            const data = await automationService.crear(req.body, req.user);

            return res.status(201).json({
                success: true,
                message: "Automatización creada correctamente.",
                data
            });
        } catch (error) {
            return responderError(res, error);
        }
    }

    async actualizar(req, res) {
        try {
            const id = Number(req.params.id);
            const data = await automationService.actualizar(
                id,
                req.body,
                req.user
            );

            return res.status(200).json({
                success: true,
                message: "Automatización actualizada correctamente.",
                data
            });
        } catch (error) {
            return responderError(res, error);
        }
    }

    async desactivar(req, res) {
        try {
            const id = Number(req.params.id);
            const data = await automationService.desactivar(id, req.user);

            return res.status(200).json({
                success: true,
                message: "Automatización desactivada correctamente.",
                data
            });
        } catch (error) {
            return responderError(res, error);
        }
    }

    async obtenerEjecuciones(req, res) {
        try {
            const id = Number(req.params.id);
            const data = await automationService.obtenerEjecuciones(
                id,
                req.user
            );

            return res.status(200).json({ success: true, data });
        } catch (error) {
            return responderError(res, error);
        }
    }
}

module.exports = new AutomationController();
