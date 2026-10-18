const opportunityRepository = require("../repositories/opportunity.repository");
const leadRepository = require("../../leads/repositories/lead.repository");
const {
    validarCrear,
    validarActualizar,
} = require("../validations/opportunity.validation");

const opportunityService = {
    async obtenerTodos(usuario) {
        if (usuario.role === "Administrador") {
            return await opportunityRepository.obtenerTodos();
        }

        return await opportunityRepository.obtenerPorUsuario(usuario.id);
    },

    async obtenerPorId(id, usuario) {
        const oportunidad = await opportunityRepository.obtenerPorId(id);

        if (!oportunidad || !oportunidad.activo) {
            throw new Error("Oportunidad no encontrada.");
        }

        if (
            usuario.role !== "Administrador" &&
            oportunidad.userId !== usuario.id
        ) {
            throw new Error(
                "No tiene permisos para acceder a esta oportunidad."
            );
        }

        return oportunidad;
    },

    async crear(datos, usuario) {
        validarCrear(datos);

        const leadId = Number(datos.leadId);

        const lead = await leadRepository.obtenerPorId(leadId);

        if (!lead || !lead.activo) {
            throw new Error("El Lead no existe o está inactivo.");
        }

        if (
            usuario.role !== "Administrador" &&
            lead.userId !== usuario.id
        ) {
            throw new Error(
                "No tiene permisos para utilizar este Lead."
            );
        }

        const datosOportunidad = {
            nombre: datos.nombre,
            descripcion: datos.descripcion,
            etapa: datos.etapa,
            monto: datos.monto,
            fechaCierre: datos.fechaCierre,
            leadId,
            userId: usuario.id,
        };

        return await opportunityRepository.crear(datosOportunidad);
    },

    async actualizar(id, datos, usuario) {
        const oportunidad = await this.obtenerPorId(id, usuario);

        validarActualizar(datos);

        let leadId;

        if (datos.leadId !== undefined) {
            leadId = Number(datos.leadId);

            const lead = await leadRepository.obtenerPorId(leadId);

            if (!lead || !lead.activo) {
                throw new Error("El Lead no existe o está inactivo.");
            }

            if (
                usuario.role !== "Administrador" &&
                lead.userId !== usuario.id
            ) {
                throw new Error(
                    "No tiene permisos para utilizar este Lead."
                );
            }
        }

        const datosActualizacion = {};

        if (datos.nombre !== undefined) {
            datosActualizacion.nombre = datos.nombre;
        }

        if (datos.descripcion !== undefined) {
            datosActualizacion.descripcion = datos.descripcion;
        }

        if (datos.etapa !== undefined) {
            datosActualizacion.etapa = datos.etapa;
        }

        if (datos.monto !== undefined) {
            datosActualizacion.monto = datos.monto;
        }

        if (datos.fechaCierre !== undefined) {
            datosActualizacion.fechaCierre = datos.fechaCierre;
        }

        if (leadId !== undefined) {
            datosActualizacion.leadId = leadId;
        }

        return await opportunityRepository.actualizar(
            oportunidad.id,
            datosActualizacion
        );
    },

    async eliminar(id, usuario) {
        await this.obtenerPorId(id, usuario);

        await opportunityRepository.eliminar(id);

        return {
            mensaje: "Oportunidad eliminada correctamente.",
        };
    },
};

module.exports = opportunityService;