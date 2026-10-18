import { useEffect, useState } from "react";
import "./Activities.css";

import {
  actualizarActividad,
  crearActividad,
  eliminarActividad,
  obtenerActividades,
} from "../../services/activity.service";
import { obtenerOportunidades } from "../../services/opportunity.service";

/* oxlint-disable react(set-state-in-effect) */

const TIPOS_ACTIVIDAD = [
  "Llamada",
  "Correo",
  "Reunión",
  "Mensaje",
  "Visita",
  "Otro",
]

;const FORMULARIO_INICIAL = {
  tipo: "",
  asunto: "",
  descripcion: "",
  fechaActividad: "",
  estado: "",
  opportunityId: "",
};

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";

  const fechaObjeto = new Date(fecha);
  if (Number.isNaN(fechaObjeto.getTime())) return "Fecha no válida";

  return fechaObjeto.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function convertirFechaParaInput(fecha) {
  if (!fecha) return "";

  const fechaObjeto = new Date(fecha);
  if (Number.isNaN(fechaObjeto.getTime())) return "";

  const year = fechaObjeto.getFullYear();
  const month = String(fechaObjeto.getMonth() + 1).padStart(2, "0");
  const day = String(fechaObjeto.getDate()).padStart(2, "0");
  const hours = String(fechaObjeto.getHours()).padStart(2, "0");
  const minutes = String(fechaObjeto.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function obtenerNombreContacto(actividad) {
  const contacto = actividad.opportunity?.lead?.contact;
  if (!contacto) return "Sin contacto";

  return [contacto.nombre, contacto.apellido].filter(Boolean).join(" ");
}

function obtenerNombreEmpresa(actividad) {
  return actividad.opportunity?.lead?.contact?.company?.nombre || "Sin empresa";
}

function obtenerNombreResponsable(actividad) {
  const usuario = actividad.user;
  if (!usuario) return "Sin responsable";

  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ");
}

function Activities() {
  const [actividades, setActividades] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const [actividadesData, oportunidadesData] = await Promise.all([
        obtenerActividades(),
        obtenerOportunidades(),
      ]);

      setActividades(actividadesData);
      setOportunidades(oportunidadesData);
    } catch (err) {
      setError(
        err.message || "No fue posible cargar la información del módulo."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
  const cargarDatosIniciales = async () => {
    try {
      const [actividadesData, oportunidadesData] = await Promise.all([
        obtenerActividades(),
        obtenerOportunidades(),
      ]);

      setActividades(actividadesData);
      setOportunidades(oportunidadesData);
    } catch (err) {
      setError(
        err.message || "No fue posible cargar la información del módulo.",
      );
    } finally {
      setCargando(false);
    }
  };

  cargarDatosIniciales();
}, []);

  function limpiarMensajes() {
    setError("");
    setMensaje("");
  }

  function abrirCrear() {
    limpiarMensajes();

    setModoEdicion(false);
    setActividadSeleccionada(null);
    setFormulario(FORMULARIO_INICIAL);
    setModalAbierto(true);
  }

  function abrirEdicion(actividad) {
    limpiarMensajes();

    setModoEdicion(true);
    setActividadSeleccionada(actividad);

    setFormulario({
      tipo: actividad.tipo || "",
      asunto: actividad.asunto || "",
      descripcion: actividad.descripcion || "",
      fechaActividad: convertirFechaParaInput(actividad.fechaActividad),
      estado: actividad.estado || "",
      opportunityId: actividad.opportunityId
        ? String(actividad.opportunityId)
        : "",
    });

    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setModoEdicion(false);
    setActividadSeleccionada(null);
    setFormulario(FORMULARIO_INICIAL);
  }

  function manejarCambio(event) {
    const { name, value } = event.target;

    setFormulario((formularioAnterior) => ({
      ...formularioAnterior,
      [name]: value,
    }));
  }

  function prepararDatos() {
    return {
      tipo: formulario.tipo,
      asunto: formulario.asunto,
      descripcion:
        formulario.descripcion.trim() === ""
          ? undefined
          : formulario.descripcion,
      fechaActividad:
        formulario.fechaActividad === ""
          ? undefined
          : new Date(formulario.fechaActividad).toISOString(),
      estado:
        formulario.estado.trim() === "" ? undefined : formulario.estado,
      opportunityId: formulario.opportunityId
        ? Number(formulario.opportunityId)
        : undefined,
    };
  }

  async function manejarEnvio(event) {
    event.preventDefault();

    try {
      setGuardando(true);
      limpiarMensajes();

      const datos = prepararDatos();

      if (modoEdicion && actividadSeleccionada) {
        const response = await actualizarActividad(
          actividadSeleccionada.id,
          datos
        );

        setMensaje(
          response.message || "Actividad actualizada correctamente."
        );
      } else {
        const response = await crearActividad(datos);

        setMensaje(response.message || "Actividad creada correctamente.");
      }

      cerrarModal();
      await cargarDatos();
    } catch (err) {
      setError(err.message || "No fue posible guardar la actividad.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminacion(actividad) {
    const confirmar = window.confirm(
      `¿Deseas eliminar la actividad "${actividad.asunto}"?`
    );

    if (!confirmar) return;

    try {
      setEliminandoId(actividad.id);
      limpiarMensajes();

      const response = await eliminarActividad(actividad.id);

      setMensaje(response.message || "Actividad eliminada correctamente.");

      await cargarDatos();
    } catch (err) {
      setError(err.message || "No fue posible eliminar la actividad.");
    } finally {
      setEliminandoId(null);
    }
  }

  // Obtener la oportunidad seleccionada directamente para no usar IIFE en el JSX
  const oportunidadSeleccionada = oportunidades.find(
    (oportunidad) => String(oportunidad.id) === formulario.opportunityId
  );
  const contactoOportunidad = oportunidadSeleccionada?.lead?.contact;
  const nombreContactoSeleccionado = contactoOportunidad
    ? [contactoOportunidad.nombre, contactoOportunidad.apellido]
        .filter(Boolean)
        .join(" ")
    : "Sin contacto";

  return (
    <section className="activities-page">
      <header className="activities-header">
        <div>
          <h1>Actividades</h1>
          <p>Registra y da seguimiento a las actividades comerciales.</p>
        </div>

        <button
          type="button"
          className="activities-primary-button"
          onClick={abrirCrear}
        >
          + Nueva actividad
        </button>
      </header>

      {Boolean(mensaje) && (
        <div className="activities-message">{mensaje}</div>
      )}

      {Boolean(error) && <div className="activities-error">{error}</div>}

      <div className="activities-card">
        <div className="activities-card-header">
          <div>
            <h2>Listado de actividades</h2>
            <p>
              {actividades.length}{" "}
              {actividades.length === 1
                ? "actividad registrada"
                : "actividades registradas"}
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="activities-empty">
            <p>Cargando actividades...</p>
          </div>
        ) : actividades.length === 0 ? (
          <div className="activities-empty">
            <h3>No hay actividades registradas</h3>
            <p>
              Registra una nueva actividad para comenzar a dar seguimiento.
            </p>

            <button
              type="button"
              className="activities-primary-button"
              onClick={abrirCrear}
            >
              + Nueva actividad
            </button>
          </div>
        ) : (
          <div className="activities-table-wrapper">
            <table className="activities-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Asunto</th>
                  <th>Oportunidad</th>
                  <th>Contacto</th>
                  <th>Empresa</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {actividades.map((actividad) => (
                  <tr key={actividad.id}>
                    <td>{actividad.tipo}</td>

                    <td>
                      <strong className="activities-name">
                        {actividad.asunto}
                      </strong>
                    </td>

                    <td>
                      <span className="activities-secondary-text">
                        {actividad.opportunity?.nombre || "Sin oportunidad"}
                      </span>
                    </td>

                    <td>{obtenerNombreContacto(actividad)}</td>

                    <td>
                      <span className="activities-secondary-text">
                        {obtenerNombreEmpresa(actividad)}
                      </span>
                    </td>

                    <td>{formatearFecha(actividad.fechaActividad)}</td>

                    <td>
                      <span className="activities-status">
                        {actividad.estado || "Sin estado"}
                      </span>
                    </td>

                    <td>
                      <span className="activities-secondary-text">
                        {obtenerNombreResponsable(actividad)}
                      </span>
                    </td>

                    <td>
                      <div className="activities-actions">
                        <button
                          type="button"
                          className="activities-action-button"
                          onClick={() => abrirEdicion(actividad)}
                          disabled={eliminandoId === actividad.id}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="activities-action-button activities-action-button--danger"
                          onClick={() => manejarEliminacion(actividad)}
                          disabled={eliminandoId === actividad.id}
                        >
                          {eliminandoId === actividad.id
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="activities-modal-overlay">
          <div className="activities-modal">
            <div className="activities-modal-header">
              <div>
                <h2>
                  {modoEdicion
                    ? "Editar actividad"
                    : "Nueva actividad"}
                </h2>

                <p>
                  Completa la información de la actividad comercial.
                </p>
              </div>

              <button
                type="button"
                className="activities-close-button"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form className="activities-form" onSubmit={manejarEnvio}>
              <div className="activities-form-grid">
                <div className="activities-form-group">
                  <label htmlFor="tipo">Tipo *</label>

                  <select
                    id="tipo"
                    name="tipo"
                    value={formulario.tipo}
                    onChange={manejarCambio}
                    required
                  >
                    <option value="">Selecciona un tipo</option>

                    {TIPOS_ACTIVIDAD.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="activities-form-group">
                  <label htmlFor="estado">Estado</label>

                  <input
                    id="estado"
                    name="estado"
                    type="text"
                    value={formulario.estado}
                    onChange={manejarCambio}
                    placeholder="Ej. Pendiente"
                  />
                </div>

                <div className="activities-form-group activities-form-group--full">
                  <label htmlFor="asunto">Asunto *</label>

                  <input
                    id="asunto"
                    name="asunto"
                    type="text"
                    value={formulario.asunto}
                    onChange={manejarCambio}
                    placeholder="Ej. Seguimiento de oportunidad"
                    required
                  />
                </div>

                <div className="activities-form-group activities-form-group--full">
                  <label htmlFor="descripcion">Descripción</label>

                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={manejarCambio}
                    placeholder="Describe los detalles de la actividad."
                  />
                </div>

                <div className="activities-form-group">
                  <label htmlFor="fechaActividad">
                    Fecha de actividad *
                  </label>

                  <input
                    id="fechaActividad"
                    name="fechaActividad"
                    type="datetime-local"
                    value={formulario.fechaActividad}
                    onChange={manejarCambio}
                    required
                  />
                </div>

                <div className="activities-form-group">
                  <label htmlFor="opportunityId">
                    Oportunidad *
                  </label>

                  <select
                    id="opportunityId"
                    name="opportunityId"
                    value={formulario.opportunityId}
                    onChange={manejarCambio}
                    required
                  >
                    <option value="">Selecciona una oportunidad</option>

                    {oportunidades.map((oportunidad) => {
                      const contacto = oportunidad.lead?.contact;
                      const nombreContacto = contacto
                        ? [contacto.nombre, contacto.apellido]
                            .filter(Boolean)
                            .join(" ")
                        : "Sin contacto";

                      return (
                        <option
                          key={oportunidad.id}
                          value={oportunidad.id}
                        >
                          {oportunidad.nombre} — {nombreContacto}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {Boolean(oportunidadSeleccionada) && (
                <div className="activities-opportunity-info">
                  <strong>Información de la oportunidad</strong>

                  <p>
                    <span>Lead:</span>{" "}
                    {oportunidadSeleccionada.lead?.titulo || "Sin lead"}
                  </p>

                  <p>
                    <span>Contacto:</span> {nombreContactoSeleccionado}
                  </p>

                  <p>
                    <span>Empresa:</span>{" "}
                    {contactoOportunidad?.company?.nombre || "Sin empresa"}
                  </p>

                  <p>
                    <span>Etapa:</span>{" "}
                    {oportunidadSeleccionada.etapa || "Sin etapa"}
                  </p>
                </div>
              )}

              <div className="activities-form-actions">
                <button
                  type="button"
                  className="activities-secondary-button"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="activities-primary-button"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : modoEdicion
                    ? "Guardar cambios"
                    : "Crear actividad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Activities;