// ============================================
// Archivo: user.transformer.js
// Descripción:
// Transformer encargado de preparar la
// información de los usuarios antes de ser
// enviada al cliente.
//
// Su principal función es ocultar información
// sensible, como la contraseña.
// ============================================

class UserTransformer {

    /**
     * Transforma un usuario.
     *
     * @param {Object} usuario
     * @returns {Object|null}
     */
    transformar(usuario) {

        if (!usuario) {
            return null;
        }

        const {
            password,
            ...usuarioTransformado
        } = usuario;

        return usuarioTransformado;

    }

    /**
     * Transforma una colección de usuarios.
     *
     * @param {Array} usuarios
     * @returns {Array}
     */
    transformarLista(usuarios) {

        return usuarios.map(

            (usuario) => this.transformar(usuario)

        );

    }

}

module.exports = new UserTransformer();