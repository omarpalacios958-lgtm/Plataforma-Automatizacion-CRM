import { useEffect, useState } from "react";
import {
  obtenerNotificaciones,
  crearNotificacion,
  actualizarNotificacion,
  eliminarNotificacion,
} from "../../services/notification.service";
import "./Notifications.css";

const FORMULARIO_INICIAL = {
  titulo: "",
  mensaje: "",
  tipo: "General",
  leida: false,
};

function Notifications() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [notificacionSeleccionada, setNotificacionSeleccionada] =
    useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  async function cargarNotificaciones() {
    setCargando(true);
    setError("");

    try {
      const datos = await obtenerNotificaciones();
      setNotificaciones(Array.isArray(datos) ? datos : []);
    } catch (err) {
      setError(
        err.message || "No fue posible cargar las notificaciones.",
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
  async function iniciarCarga() {
    await cargarNotificaciones();
  }

  iniciarCarga();
  }, []);

  function abrirCrear() {
    setNotificacionSeleccionada(null);
    setFormulario(FORMULARIO_INICIAL);
    setError("");
    setMensajeExito("");
    setModalAbierto(true);
  }

  function abrirEditar(notificacion) {
    setNotificacionSeleccionada(notificacion);
    setFormulario({
      titulo: notificacion.titulo ?? "",
      mensaje: notificacion.mensaje ?? "",
      tipo: notificacion.tipo ?? "General",
      leida: Boolean(notificacion.leida),
    });
    setError("");
    setMensajeExito("");
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setNotificacionSeleccionada(null);
    setFormulario(FORMULARIO_INICIAL);
    setError("");
  }

  function manejarCambio(evento) {
    const { name, value, type, checked } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setMensajeExito("");

    const datos = {
      titulo: formulario.titulo.trim(),
      mensaje: formulario.mensaje.trim(),
      tipo: formulario.tipo.trim(),
      leida: formulario.leida,
    };

    setGuardando(true);

    try {
      if (notificacionSeleccionada) {
        await actualizarNotificacion(
          notificacionSeleccionada.id,
          datos,
        );
        setMensajeExito("Notificación actualizada correctamente.");
      } else {
        await crearNotificacion(datos);
        setMensajeExito("Notificación creada correctamente.");
      }

      setModalAbierto(false);
      setNotificacionSeleccionada(null);
      setFormulario(FORMULARIO_INICIAL);

      await cargarNotificaciones();
    } catch (err) {
      setError(
        err.message || "No fue posible guardar la notificación.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoLectura(notificacion) {
    setError("");
    setMensajeExito("");

    try {
      await actualizarNotificacion(notificacion.id, {
        leida: !notificacion.leida,
      });

      setMensajeExito(
        notificacion.leida
          ? "Notificación marcada como no leída."
          : "Notificación marcada como leída.",
      );

      await cargarNotificaciones();
    } catch (err) {
      setError(
        err.message || "No fue posible cambiar el estado de lectura.",
      );
    }
  }

  async function manejarEliminar(notificacion) {
    const confirmar = window.confirm(
      "¿Deseas eliminar la notificación \"" +
        notificacion.titulo +
        "\"?",
    );

    if (!confirmar) return;

    setError("");
    setMensajeExito("");

    try {
      await eliminarNotificacion(notificacion.id);
      setMensajeExito("Notificación eliminada correctamente.");
      await cargarNotificaciones();
    } catch (err) {
      setError(
        err.message || "No fue posible eliminar la notificación.",
      );
    }
  }

  const totalNoLeidas = notificaciones.filter(
    (notificacion) => !notificacion.leida,
  ).length;

  return (
    <section className="notifications-page">
      <header className="notifications-header">
        <div>
          <h1>Notificaciones</h1>
          <p>
            Consulta y administra las notificaciones de tu cuenta.
          </p>
        </div>

        <button
          type="button"
          className="notifications-button notifications-button-primary"
          onClick={abrirCrear}
        >
          Nueva notificación
        </button>
      </header>

      <div className="notifications-summary">
        <div className="notifications-summary-card">
          <span>Total de notificaciones</span>
          <strong>{notificaciones.length}</strong>
        </div>

        <div className="notifications-summary-card">
          <span>Sin leer</span>
          <strong>{totalNoLeidas}</strong>
        </div>
      </div>

      {error && (
        <div className="notifications-alert notifications-alert-error" role="alert">
          {error}
        </div>
      )}

      {mensajeExito && (
        <div className="notifications-alert notifications-alert-success" role="status">
          {mensajeExito}
        </div>
      )}

      <div className="notifications-list-header">
        <h2>Listado de notificaciones</h2>

        <button
          type="button"
          className="notifications-button notifications-button-secondary"
          onClick={cargarNotificaciones}
          disabled={cargando}
        >
          Actualizar
        </button>
      </div>

      {cargando ? (
        <div className="notifications-empty">
          Cargando notificaciones...
        </div>
      ) : notificaciones.length === 0 ? (
        <div className="notifications-empty">
          <h3>No hay notificaciones</h3>
          <p>Cuando tengas notificaciones, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="notifications-table-container">
          <table className="notifications-table">
            <thead>
              <tr>
                <th>Notificación</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Destinatario</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {notificaciones.map((notificacion) => {
                const nombreUsuario = notificacion.user
                  ? [
                      notificacion.user.nombre,
                      notificacion.user.apellido,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "—";

                return (
                  <tr
                    key={notificacion.id}
                    className={
                      notificacion.leida
                        ? ""
                        : "notifications-row-unread"
                    }
                  >
                    <td>
                      <div className="notifications-title-cell">
                        <strong>{notificacion.titulo}</strong>
                        <p>{notificacion.mensaje}</p>
                      </div>
                    </td>

                    <td>
                      <span className="notifications-type">
                        {notificacion.tipo}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`notifications-status ${
                          notificacion.leida
                            ? "notifications-status-read"
                            : "notifications-status-unread"
                        }`}
                      >
                        {notificacion.leida ? "Leída" : "Sin leer"}
                      </span>
                    </td>

                    <td>{nombreUsuario}</td>

                    <td>
                      <div className="notifications-actions">
                        <button
                          type="button"
                          className="notifications-action-button"
                          onClick={() => abrirEditar(notificacion)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="notifications-action-button"
                          onClick={() =>
                            cambiarEstadoLectura(notificacion)
                          }
                        >
                          {notificacion.leida
                            ? "Marcar sin leer"
                            : "Marcar leída"}
                        </button>

                        <button
                          type="button"
                          className="notifications-action-button notifications-action-danger"
                          onClick={() =>
                            manejarEliminar(notificacion)
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <div
          className="notifications-modal-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              cerrarModal();
            }
          }}
        >
          <section
            className="notifications-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notifications-modal-title"
          >
            <header className="notifications-modal-header">
              <div>
                <h2 id="notifications-modal-title">
                  {notificacionSeleccionada
                    ? "Editar notificación"
                    : "Nueva notificación"}
                </h2>
                <p>
                  Completa la información de la notificación.
                </p>
              </div>

              <button
                type="button"
                className="notifications-modal-close"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form
              className="notifications-form"
              onSubmit={manejarEnvio}
            >
              <label htmlFor="notification-titulo">
                Título
              </label>
              <input
                id="notification-titulo"
                name="titulo"
                type="text"
                value={formulario.titulo}
                onChange={manejarCambio}
                maxLength={150}
                required
              />

              <label htmlFor="notification-mensaje">
                Mensaje
              </label>
              <textarea
                id="notification-mensaje"
                name="mensaje"
                value={formulario.mensaje}
                onChange={manejarCambio}
                maxLength={500}
                rows={4}
                required
              />

              <label htmlFor="notification-tipo">
                Tipo
              </label>
              <input
                id="notification-tipo"
                name="tipo"
                type="text"
                value={formulario.tipo}
                onChange={manejarCambio}
                maxLength={50}
                required
              />

              <label className="notifications-checkbox-label">
                <input
                  name="leida"
                  type="checkbox"
                  checked={formulario.leida}
                  onChange={manejarCambio}
                />
                Marcar como leída
              </label>

              {error && (
                <div
                  className="notifications-alert notifications-alert-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <footer className="notifications-form-actions">
                <button
                  type="button"
                  className="notifications-button notifications-button-secondary"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="notifications-button notifications-button-primary"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : notificacionSeleccionada
                      ? "Guardar cambios"
                      : "Crear notificación"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default Notifications;