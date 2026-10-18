const automationRepository = require("../repositories/automation.repository");
const automationValidation = require("../validations/automation.validation");

class AutomationService {
    validarAdministrador(usuario) {
        if (!usuario || usuario.role !== "Administrador") {
            throw new Error("No tiene permisos para administrar automatizaciones.");
        }
    }

    async obtenerTodos(usuario) {
        this.validarAdministrador(usuario);
        return automationRepository.obtenerTodos();
    }

    async obtenerPorId(id, usuario) {
        this.validarAdministrador(usuario);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error("El ID de la automatización no es válido.");
        }

        const automation = await automationRepository.obtenerPorId(id);

        if (!automation) {
            throw new Error("Automatización no encontrada.");
        }

        return automation;
    }

    async crear(datos, usuario) {
        this.validarAdministrador(usuario);
        automationValidation.validarCrear(datos);

        return automationRepository.crear({
            nombre: datos.nombre.trim(),
            descripcion: datos.descripcion?.trim() || null,
            evento: datos.evento,
            activa: datos.activa ?? false,
            userId: usuario.id,
            acciones: datos.acciones ?? []
        });
    }

    async actualizar(id, datos, usuario) {
        this.validarAdministrador(usuario);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error("El ID de la automatización no es válido.");
        }

        const automation = await automationRepository.obtenerPorId(id);

        if (!automation) {
            throw new Error("Automatización no encontrada.");
        }

        automationValidation.validarActualizar(datos);

        // No modificar las acciones si ya existe historial de ejecución.
        if (datos.acciones !== undefined) {
            const ejecuciones = await automationRepository.obtenerEjecuciones(id);

            if (ejecuciones.length > 0) {
                throw new Error(
                    "No se pueden modificar las acciones porque la automatización ya tiene historial de ejecuciones."
                );
            }
        }

        const datosActualizacion = {};

        if (datos.nombre !== undefined) {
            datosActualizacion.nombre = datos.nombre.trim();
        }

        if (datos.descripcion !== undefined) {
            datosActualizacion.descripcion = datos.descripcion?.trim() || null;
        }

        if (datos.evento !== undefined) {
            datosActualizacion.evento = datos.evento;
        }

        if (datos.activa !== undefined) {
            datosActualizacion.activa = datos.activa;
        }

        if (datos.acciones !== undefined) {
            datosActualizacion.acciones = datos.acciones;
        }

        return automationRepository.actualizar(id, datosActualizacion);
    }

    async desactivar(id, usuario) {
        this.validarAdministrador(usuario);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error("El ID de la automatización no es válido.");
        }

        const automation = await automationRepository.obtenerPorId(id);

        if (!automation) {
            throw new Error("Automatización no encontrada.");
        }

        if (!automation.activa) {
            return automation;
        }

        return automationRepository.desactivar(id);
    }

    async obtenerEjecuciones(id, usuario) {
        this.validarAdministrador(usuario);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error("El ID de la automatización no es válido.");
        }

        const automation = await automationRepository.obtenerPorId(id);

        if (!automation) {
            throw new Error("Automatización no encontrada.");
        }

        return automationRepository.obtenerEjecuciones(id);
    }
}

module.exports = new AutomationService();