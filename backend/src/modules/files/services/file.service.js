// ============================================
// Archivo: file.service.js
// Descripción:
// Contiene la lógica de negocio del
// módulo Files.
// ============================================

const fileRepository =
    require("../repositories/file.repository");

const fs = require("fs/promises");

const prisma =
    require("../../../config/database");

// ============================================

class FileService {

    /**
     * Obtiene todos los archivos activos.
     *
     * Administrador:
     * - Todos los archivos.
     *
     * Otros usuarios:
     * - Solo sus propios archivos.
     *
     * @param {Object} usuario
     * @returns {Promise<Array>}
     */
    async obtenerTodos(usuario) {

        if (usuario.role === "Administrador") {

            return await fileRepository.obtenerTodos();

        }

        return await fileRepository.obtenerPorUsuario(
            usuario.id
        );

    }

    /**
     * Obtiene un archivo por ID.
     *
     * Administrador:
     * - Puede acceder a cualquier archivo activo.
     *
     * Otros usuarios:
     * - Solo pueden acceder a sus propios archivos.
     *
     * @param {number} id
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async obtenerPorId(id, usuario) {

        const archivo =
            await fileRepository.obtenerPorId(id);

        if (!archivo) {

            throw new Error(
                "El archivo no fue encontrado."
            );

        }

        if (
            usuario.role !== "Administrador" &&
            archivo.userId !== usuario.id
        ) {

            throw new Error(
                "No tiene permisos para acceder a este archivo."
            );

        }

        return archivo;

    }

    /**
     * Valida que una asociación pertenezca al usuario.
     *
     * Administrador:
     * - Puede utilizar cualquier entidad activa.
     *
     * Otros usuarios:
     * - Solo pueden utilizar entidades propias y activas.
     *
     * @param {Object} datos
     * @param {Object} usuario
     */
    async validarAsociacionPropiedad(datos, usuario) {

        let entidad = null;
        let nombreEntidad = "";

        if (datos.companyId) {

            entidad =
                await prisma.company.findFirst({

                    where: {
                        id: datos.companyId,
                        activo: true
                    }

                });

            nombreEntidad = "empresa";

        }

        else if (datos.contactId) {

            entidad =
                await prisma.contact.findFirst({

                    where: {
                        id: datos.contactId,
                        activo: true
                    }

                });

            nombreEntidad = "contacto";

        }

        else if (datos.leadId) {

            entidad =
                await prisma.lead.findFirst({

                    where: {
                        id: datos.leadId,
                        activo: true
                    }

                });

            nombreEntidad = "lead";

        }

        else if (datos.opportunityId) {

            entidad =
                await prisma.opportunity.findFirst({

                    where: {
                        id: datos.opportunityId,
                        activo: true
                    }

                });

            nombreEntidad = "oportunidad";

        }

        if (!entidad) {

            throw new Error(
                `La ${nombreEntidad} asociada no existe o está inactiva.`
            );

        }

        // ========================================
        // Administrador
        // ========================================

        if (usuario.role === "Administrador") {

            return true;

        }

        // ========================================
        // Verificar propietario
        // ========================================

        if (entidad.userId !== usuario.id) {

            throw new Error(
                "No tiene permisos para asociar el archivo a esta entidad."
            );

        }

        return true;

    }

    /**
     * Registra un nuevo archivo.
     *
     * El userId siempre se obtiene del usuario
     * autenticado y nunca del cliente.
     *
     * @param {Object} datos
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async crear(datos, usuario) {

        await this.validarAsociacionPropiedad(
            datos,
            usuario
        );

        const datosPermitidos = {

            nombre: datos.nombre,

            nombreOriginal:
                datos.nombreOriginal,

            ruta:
                datos.ruta,

            tipoMime:
                datos.tipoMime,

            extension:
                datos.extension,

            tamano:
                datos.tamano,

            userId:
                usuario.id,

            companyId:
                datos.companyId ?? null,

            contactId:
                datos.contactId ?? null,

            leadId:
                datos.leadId ?? null,

            opportunityId:
                datos.opportunityId ?? null

        };

        return await fileRepository.crear(
            datosPermitidos
        );

    }

    /**
     * Actualiza un archivo.
     *
     * Se permite:
     * - Cambiar nombre.
     * - Reemplazar archivo.
     * - Mantener asociación.
     * - Cambiar asociación, siempre que la nueva
     *   asociación sea válida y pertenezca al usuario.
     *
     * El userId y activo no pueden modificarse.
     *
     * @param {number} id
     * @param {Object} datos
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async actualizar(id, datos, usuario) {

        // ========================================
        // 1. Buscar archivo existente
        // ========================================

        const archivoExistente =
            await this.obtenerPorId(
                id,
                usuario
            );

        // ========================================
        // 2. Detectar si se está modificando
        //    la asociación
        // ========================================

        const asociacionEnviada =
            datos.companyId !== undefined ||
            datos.contactId !== undefined ||
            datos.leadId !== undefined ||
            datos.opportunityId !== undefined;

        let datosAsociacion = null;

        if (asociacionEnviada) {

            const asociaciones = [

                datos.companyId,

                datos.contactId,

                datos.leadId,

                datos.opportunityId

            ].filter(
                valor =>
                    valor !== undefined &&
                    valor !== null
            );

            if (asociaciones.length !== 1) {

                throw new Error(
                    "El archivo debe estar asociado exactamente a una entidad."
                );

            }

            datosAsociacion = {

                companyId:
                    datos.companyId ?? null,

                contactId:
                    datos.contactId ?? null,

                leadId:
                    datos.leadId ?? null,

                opportunityId:
                    datos.opportunityId ?? null

            };

            await this.validarAsociacionPropiedad(
                datosAsociacion,
                usuario
            );

        }

        // ========================================
        // 3. Determinar si existe reemplazo físico
        // ========================================

        const reemplazoFisico =
            Boolean(
                datos.ruta &&
                archivoExistente.ruta
            );

        // ========================================
        // 4. Preparar datos permitidos
        // ========================================

        const datosPermitidos = {};

        if (datos.nombre !== undefined) {

            datosPermitidos.nombre =
                datos.nombre;

        }

        if (datos.nombreOriginal !== undefined) {

            datosPermitidos.nombreOriginal =
                datos.nombreOriginal;

        }

        if (datos.ruta !== undefined) {

            datosPermitidos.ruta =
                datos.ruta;

        }

        if (datos.tipoMime !== undefined) {

            datosPermitidos.tipoMime =
                datos.tipoMime;

        }

        if (datos.extension !== undefined) {

            datosPermitidos.extension =
                datos.extension;

        }

        if (datos.tamano !== undefined) {

            datosPermitidos.tamano =
                datos.tamano;

        }

        // ========================================
        // Asociación
        // ========================================

        if (asociacionEnviada) {

            datosPermitidos.companyId =
                datosAsociacion.companyId;

            datosPermitidos.contactId =
                datosAsociacion.contactId;

            datosPermitidos.leadId =
                datosAsociacion.leadId;

            datosPermitidos.opportunityId =
                datosAsociacion.opportunityId;

        }

        // ========================================
        // 5. Actualizar primero la BD
        // ========================================

        try {

            const archivoActualizado =
                await fileRepository.actualizar(
                    id,
                    datosPermitidos
                );

            // ====================================
            // 6. Eliminar archivo físico anterior
            // ====================================

            if (reemplazoFisico) {

                try {

                    await fs.unlink(
                        archivoExistente.ruta
                    );

                    console.log(
                        "Archivo físico anterior eliminado correctamente."
                    );

                } catch (error) {

                    console.error(
                        "No se pudo eliminar el archivo físico anterior:",
                        error.message
                    );

                }

            }

            return archivoActualizado;

        } catch (error) {

            // ====================================
            // 7. Rollback físico
            // ====================================

            if (reemplazoFisico) {

                try {

                    await fs.unlink(
                        datos.ruta
                    );

                    console.log(
                        "Nuevo archivo eliminado debido a un error en la actualización."
                    );

                } catch (errorArchivo) {

                    console.error(
                        "No se pudo eliminar el nuevo archivo después del error:",
                        errorArchivo.message
                    );

                }

            }

            throw error;

        }

    }

    /**
     * Eliminación lógica.
     *
     * Administrador:
     * - Puede eliminar cualquier archivo.
     *
     * Otros usuarios:
     * - Solo pueden eliminar sus propios archivos.
     *
     * @param {number} id
     * @param {Object} usuario
     * @returns {Promise<Object>}
     */
    async eliminar(id, usuario) {

        await this.obtenerPorId(
            id,
            usuario
        );

        return await fileRepository.eliminar(id);

    }

}

// ============================================

module.exports = new FileService();