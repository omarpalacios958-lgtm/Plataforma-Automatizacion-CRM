import { useEffect, useState } from "react";

import "./Users.css";

import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  obtenerUsuarios,
} from "../../services/user.service";
import { obtenerRoles } from "../../services/role.service";

const formularioInicial = {
  nombre: "",
  apellido: "",
  correo: "",
  password: "",
  roleId: "",
};

function Users() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [usuarioEliminando, setUsuarioEliminando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [error, setError] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");

  const cargarUsuarios = async () => {
    try {
      const data = await obtenerUsuarios();
      setUsuarios(data);
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setCargando(true);
        setError("");

        const [usuariosData, rolesData] = await Promise.all([
          obtenerUsuarios(),
          obtenerRoles(),
        ]);

        setUsuarios(usuariosData);
        setRoles(rolesData);
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosIniciales();
  }, []);

  const manejarCambio = (event) => {
    const { name, value } = event.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
  };

  const abrirFormulario = () => {
    setUsuarioEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario("");
    setMostrarFormulario(true);
  };

  const abrirEdicion = (usuario) => {
    setUsuarioEditando(usuario);
    setFormulario({
      nombre: usuario.nombre || "",
      apellido: usuario.apellido || "",
      correo: usuario.correo || "",
      password: "",
      roleId: String(usuario.roleId ?? usuario.role?.id ?? ""),
    });
    setErrorFormulario("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setUsuarioEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario("");
    setMostrarFormulario(false);
  };

  const manejarEnvio = async (event) => {
    event.preventDefault();

    try {
      setGuardando(true);
      setErrorFormulario("");

      const datosUsuario = {
        nombre: formulario.nombre.trim(),
        apellido: formulario.apellido.trim(),
        correo: formulario.correo.trim(),
        roleId: Number(formulario.roleId),
      };

      if (!usuarioEditando || formulario.password.trim() !== "") {
        datosUsuario.password = formulario.password;
      }

      if (usuarioEditando) {
        await actualizarUsuario(usuarioEditando.id, datosUsuario);
      } else {
        await crearUsuario(datosUsuario);
      }

      setFormulario(formularioInicial);
      setUsuarioEditando(null);
      setMostrarFormulario(false);

      await cargarUsuarios();
    } catch (error) {
      setErrorFormulario(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const manejarEliminacion = async (usuario) => {
    const confirmar = window.confirm(
      `¿Está seguro de desactivar al usuario "${usuario.nombre} ${usuario.apellido}"?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminando(true);
      setUsuarioEliminando(usuario.id);
      setError("");

      await eliminarUsuario(usuario.id);
      await cargarUsuarios();
    } catch (error) {
      setError(error.message);
    } finally {
      setEliminando(false);
      setUsuarioEliminando(null);
    }
  };

  if (cargando) {
    return (
      <section className="users">
        <div className="users__header">
          <div>
            <h2 className="users__title">Usuarios</h2>
            <p className="users__description">
              Gestiona los usuarios y sus permisos de acceso.
            </p>
          </div>
        </div>

        <div className="users__empty">
          <p>Cargando usuarios...</p>
        </div>
      </section>
    );
  }

  if (error && usuarios.length === 0) {
    return (
      <section className="users">
        <div className="users__header">
          <div>
            <h2 className="users__title">Usuarios</h2>
            <p className="users__description">
              Gestiona los usuarios y sus permisos de acceso.
            </p>
          </div>
        </div>

        <div className="users__error">
          <p>No fue posible obtener los datos.</p>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="users">
      <div className="users__header">
        <div>
          <h2 className="users__title">Usuarios</h2>
          <p className="users__description">
            Gestiona los usuarios y sus permisos de acceso.
          </p>
        </div>

        <button
          type="button"
          className="users__button"
          onClick={abrirFormulario}
          disabled={eliminando}
        >
          Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="users__error">
          <p>{error}</p>
        </div>
      )}

      {mostrarFormulario && (
        <div className="users__form-container">
          <div className="users__form-header">
            <div>
              <h3>
                {usuarioEditando ? "Editar usuario" : "Registrar usuario"}
              </h3>
              <p>
                {usuarioEditando
                  ? "Modifica los datos del usuario."
                  : "Completa los datos del nuevo usuario."}
              </p>
            </div>
          </div>

          <form className="users__form" onSubmit={manejarEnvio}>
            <div className="users__form-row">
              <div className="users__form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formulario.nombre}
                  onChange={manejarCambio}
                  maxLength={100}
                  autoComplete="given-name"
                  required
                />
              </div>

              <div className="users__form-group">
                <label htmlFor="apellido">Apellido *</label>
                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  value={formulario.apellido}
                  onChange={manejarCambio}
                  maxLength={100}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="users__form-row">
              <div className="users__form-group">
                <label htmlFor="correo">Correo electrónico *</label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  value={formulario.correo}
                  onChange={manejarCambio}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="users__form-group">
                <label htmlFor="roleId">Rol *</label>
                <select
                  id="roleId"
                  name="roleId"
                  value={formulario.roleId}
                  onChange={manejarCambio}
                  required
                >
                  <option value="">Selecciona un rol</option>

                  {roles.map((rol) => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="users__form-row">
              <div className="users__form-group">
                <label htmlFor="password">
                  Contraseña {usuarioEditando ? "(opcional)" : "*"}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formulario.password}
                  onChange={manejarCambio}
                  minLength={6}
                  autoComplete={
                    usuarioEditando ? "new-password" : "new-password"
                  }
                  required={!usuarioEditando}
                />
                {usuarioEditando && (
                  <small>
                    Déjala vacía para conservar la contraseña actual.
                  </small>
                )}
              </div>
            </div>

            {errorFormulario && (
              <div className="users__form-error">
                <p>{errorFormulario}</p>
              </div>
            )}

            <div className="users__form-actions">
              <button
                type="button"
                className="users__button users__button--secondary"
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="users__button"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : usuarioEditando
                    ? "Actualizar usuario"
                    : "Guardar usuario"}
              </button>
            </div>
          </form>
        </div>
      )}

      {usuarios.length === 0 ? (
        <div className="users__empty">
          <p>No hay usuarios registrados.</p>
        </div>
      ) : (
        <div className="users__table-container">
          <table className="users__table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Correo electrónico</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.apellido || "-"}</td>
                  <td>{usuario.correo}</td>
                  <td>{usuario.role?.nombre || "-"}</td>
                  <td>
                    <span
                      className={`users__status ${
                        usuario.activo
                          ? "users__status--active"
                          : "users__status--inactive"
                      }`}
                    >
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="users__actions">
                    <button
                      type="button"
                      className="users__button users__button--secondary"
                      onClick={() => abrirEdicion(usuario)}
                      disabled={eliminando}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="users__button users__button--secondary"
                      onClick={() => manejarEliminacion(usuario)}
                      disabled={eliminando || !usuario.activo}
                    >
                      {eliminando && usuarioEliminando === usuario.id
                        ? "Desactivando..."
                        : "Desactivar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Users;