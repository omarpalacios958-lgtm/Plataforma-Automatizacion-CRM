// ============================================
// Archivo: task.service.js
// Descripción:
// Contiene la lógica de negocio del
// módulo de Tareas.
// ============================================

const taskRepository = require("../repositories/task.repository");
const taskValidation = require("../validations/task.validation");

class TaskService {

    /**
     * Obtiene las tareas según el rol del usuario.
     *
     * Administrador:
     * Obtiene todas las tareas activas.
     *
     * Vendedor:
     * Obtiene únicamente sus tareas activas.
     *
     * @param {Object} usuario
     */
    async obtenerTodos(usuario) {

        if (usuario.role === "Administrador") {

            return await taskRepository.obtenerTodos();

        }

        return await taskRepository.obtenerPorUsuario(usuario.id);

    }

    /**
     * Obtiene una tarea por ID verificando
     * que el usuario tenga permisos.
     *
     * @param {number} id
     * @param {Object} usuario
     */
    async obtenerPorId(id, usuario) {

        const task = await taskRepository.obtenerPorId(id);

        if (!task || !task.activo) {

            throw new Error("Tarea no encontrada.");

        }

        if (usuario.role === "Administrador") {

            return task;

        }

        if (task.userId !== usuario.id) {

            throw new Error(
                "No tiene permisos para acceder a esta tarea."
            );

        }

        return task;

    }

    /**
     * Crea una nueva tarea.
     *
     * El userId se obtiene del usuario autenticado
     * y no del cuerpo de la petición.
     *
     * @param {Object} datos
     * @param {Object} usuario
     */
    async crear(datos, usuario) {

        taskValidation.validarCrear(datos);

        const datosPermitidos = {

            titulo: datos.titulo,
            descripcion: datos.descripcion,
            prioridad: datos.prioridad,
            estado: datos.estado,
            fechaLimite: datos.fechaLimite
                ? new Date(datos.fechaLimite)
                : undefined,
            userId: usuario.id

        };

        return await taskRepository.crear(datosPermitidos);

    }

    /**
     * Actualiza una tarea propia o cualquier tarea
     * si el usuario es Administrador.
     *
     * @param {number} id
     * @param {Object} datos
     * @param {Object} usuario
     */
    async actualizar(id, datos, usuario) {

        await this.obtenerPorId(id, usuario);

        taskValidation.validarActualizar(datos);

        const datosPermitidos = {};

        if (datos.titulo !== undefined) {

            datosPermitidos.titulo = datos.titulo;

        }

        if (datos.descripcion !== undefined) {

            datosPermitidos.descripcion = datos.descripcion;

        }

        if (datos.prioridad !== undefined) {

            datosPermitidos.prioridad = datos.prioridad;

        }

        if (datos.estado !== undefined) {

            datosPermitidos.estado = datos.estado;

        }

        if (datos.fechaLimite !== undefined) {

            datosPermitidos.fechaLimite =
                datos.fechaLimite === null
                    ? null
                    : new Date(datos.fechaLimite);

        }

        return await taskRepository.actualizar(
            id,
            datosPermitidos
        );

    }

    /**
     * Eliminación lógica.
     *
     * @param {number} id
     * @param {Object} usuario
     */
    async eliminar(id, usuario) {

        await this.obtenerPorId(id, usuario);

        return await taskRepository.eliminar(id);

    }

}

module.exports = new TaskService();