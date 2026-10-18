// ============================================
// Archivo: auth.repository.js
// Descripción:
// Acceso a la base de datos del módulo
// de autenticación mediante Prisma.
// ============================================

const prisma = require("../../../config/database");

class AuthRepository {

    /**
     * Verifica que el repositorio funciona.
     */
    async verificarConexion() {

        return {
            modulo: "Autenticación",
            estado: "Activo",
            mensaje: "AuthRepository funcionando correctamente."
        };

    }

    /**
     * Busca un usuario por correo.
     */
    async buscarPorCorreo(correo) {

        return await prisma.user.findUnique({

            where: {
                correo
            },

            include: {
                role: true
            }

        });

    }

    /**
     * Crea un nuevo usuario.
     *
     * @param {Object} datos
     * @returns {Promise<Object>}
     */
    async crearUsuario(datos) {

        return await prisma.user.create({

            data: {

                nombre: datos.nombre,
                apellido: datos.apellido,
                correo: datos.correo,
                password: datos.password,
                roleId: datos.roleId

            }

        });

    }

}

module.exports = new AuthRepository();