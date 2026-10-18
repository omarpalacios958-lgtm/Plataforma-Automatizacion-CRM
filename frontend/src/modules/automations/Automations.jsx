
import { useEffect, useState } from "react";
import {
  actualizarAutomatizacion,
  crearAutomatizacion,
  desactivarAutomatizacion,
  obtenerAutomatizaciones,
  obtenerEjecuciones,
} from "../../services/automation.service";
import "./Automations.css";

const FORMULARIO_INICIAL = {
  nombre: "",
  descripcion: "",
  evento: "LEAD_CREADO",
  activa: false,
};

const ACCION_INICIAL = {
  tipo: "CREAR_TAREA",
  configuracion: {
    titulo: "",
    descripcion: "",
    prioridad: "Media",
    estado: "Pendiente",
    fechaLimite: "",
  },
  activa: true,
};

const EVENTOS = [
  { valor: "LEAD_CREADO", etiqueta: "Cuando se crea un lead" },
  {
    valor: "SEGUIMIENTO_VENCIDO",
    etiqueta: "Cuando vence el seguimiento de un lead",
  },
];

const TIPOS_ACCION = [
  { valor: "CREAR_TAREA", etiqueta: "Crear tarea" },
  { valor: "CREAR_NOTIFICACION", etiqueta: "Crear notificación" },
  { valor: "ENVIAR_CORREO", etiqueta: "Enviar correo" },
];

function crearAccion(tipo = "CREAR_TAREA") {
  const configuraciones = {
    CREAR_TAREA: {
      titulo: "",
      descripcion: "",
      prioridad: "Media",
      estado: "Pendiente",
      fechaLimite: "",
    },
    CREAR_NOTIFICACION: {
      titulo: "",
      mensaje: "",
      tipo: "Automatizacion",
    },
    ENVIAR_CORREO: {
      destinatario: "",
      asunto: "",
      mensaje: "",
    },
  };

  return {
    tipo,
    configuracion: configuraciones[tipo],
    activa: true,
  };
}

function formatearFecha(fecha) {
  if (!fecha) return "—";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return "—";

  return valor.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function etiquetaEvento(evento) {
  return EVENTOS.find((item) => item.valor === evento)?.etiqueta ?? evento;
}

function etiquetaAccion(tipo) {
  return TIPOS_ACCION.find((item) => item.valor === tipo)?.etiqueta ?? tipo;
}

function normalizarFecha(fecha) {
  if (!fecha) return "";
  return String(fecha).slice(0, 10);
}

function Automations() {
  const [automatizaciones, setAutomatizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [automatizacionSeleccionada, setAutomatizacionSeleccionada] =
    useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [acciones, setAcciones] = useState([{ ...ACCION_INICIAL }]);
  const [tieneHistorial, setTieneHistorial] = useState(false);
  const [consultandoHistorial, setConsultandoHistorial] = useState(false);

  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [automatizacionHistorial, setAutomatizacionHistorial] = useState(null);
  const [ejecuciones, setEjecuciones] = useState([]);
  const [cargandoEjecuciones, setCargandoEjecuciones] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarAutomatizaciones() {
    setCargando(true);
    setError("");

    try {
      const respuesta = await obtenerAutomatizaciones();
      setAutomatizaciones(respuesta.data ?? []);
    } catch (err) {
      setError(err.message || "No fue posible cargar las automatizaciones.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const respuesta = await obtenerAutomatizaciones();

        if (activo) {
          setAutomatizaciones(respuesta.data ?? []);
        }
      } catch (err) {
        if (activo) {
          setError(
            err.message || "No fue posible cargar las automatizaciones.",
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, []);

  function cambiarCampo(evento) {
    const { name, value, type, checked } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function abrirFormulario(automatizacion = null) {
    setError("");
    setMensaje("");
    setTieneHistorial(false);
    setAutomatizacionSeleccionada(automatizacion);

    if (!automatizacion) {
      setFormulario({ ...FORMULARIO_INICIAL });
      setAcciones([crearAccion()]);
      setModalAbierto(true);
      return;
    }

    setFormulario({
      nombre: automatizacion.nombre ?? "",
      descripcion: automatizacion.descripcion ?? "",
      evento: automatizacion.evento ?? "LEAD_CREADO",
      activa: Boolean(automatizacion.activa),
    });

    setAcciones(
      (automatizacion.acciones ?? []).map((accion) => ({
        tipo: accion.tipo,
        configuracion: { ...accion.configuracion },
        activa: accion.activa,
        orden: accion.orden,
      })),
    );

    setModalAbierto(true);
    setConsultandoHistorial(true);

    try {
      const respuesta = await obtenerEjecuciones(automatizacion.id);
      setTieneHistorial((respuesta.data ?? []).length > 0);
    } catch (err) {
      setError(
        `No fue posible comprobar el historial: ${err.message}. No modifiques las acciones hasta volver a intentarlo.`,
      );
      setTieneHistorial(true);
    } finally {
      setConsultandoHistorial(false);
    }
  }

  function cerrarFormulario() {
    if (guardando) return;

    setModalAbierto(false);
    setAutomatizacionSeleccionada(null);
    setFormulario({ ...FORMULARIO_INICIAL });
    setAcciones([crearAccion()]);
    setTieneHistorial(false);
    setError("");
  }

  function cambiarTipoAccion(indice, tipo) {
    setAcciones((actuales) =>
      actuales.map((accion, i) =>
        i === indice
          ? { ...crearAccion(tipo), orden: indice + 1 }
          : accion,
      ),
    );
  }

  function cambiarConfiguracion(indice, campo, valor) {
    setAcciones((actuales) =>
      actuales.map((accion, i) =>
        i === indice
          ? {
              ...accion,
              configuracion: {
                ...accion.configuracion,
                [campo]: valor,
              },
            }
          : accion,
      ),
    );
  }

  function agregarAccion() {
    setAcciones((actuales) => [...actuales, crearAccion()]);
  }

  function eliminarAccion(indice) {
    setAcciones((actuales) =>
      actuales
        .filter((_, i) => i !== indice)
        .map((accion, i) => ({ ...accion, orden: i + 1 })),
    );
  }

  function validarAcciones() {
    if (acciones.length === 0) {
      return "Agrega al menos una acción a la automatización.";
    }

    for (let i = 0; i < acciones.length; i += 1) {
      const { tipo, configuracion } = acciones[i];
      const numero = i + 1;

      if (tipo === "CREAR_TAREA" && !configuracion.titulo.trim()) {
        return `La acción ${numero}: el título de la tarea es obligatorio.`;
      }

      if (
        tipo === "CREAR_NOTIFICACION" &&
        (!configuracion.titulo.trim() ||
          !configuracion.mensaje.trim() ||
          !configuracion.tipo.trim())
      ) {
        return `La acción ${numero}: completa el título, el mensaje y el tipo de notificación.`;
      }

      if (tipo === "ENVIAR_CORREO") {
        const { destinatario, asunto, mensaje: cuerpo } = configuracion;
        const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          destinatario.trim(),
        );

        if (!correoValido || !asunto.trim() || !cuerpo.trim()) {
          return `La acción ${numero}: proporciona un correo válido, asunto y mensaje.`;
        }
      }
    }

    return "";
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const nombre = formulario.nombre.trim();

    if (!nombre) {
      setError("El nombre de la automatización es obligatorio.");
      return;
    }

    if (nombre.length > 150) {
      setError("El nombre no puede superar los 150 caracteres.");
      return;
    }

    if (formulario.descripcion.trim().length > 500) {
      setError("La descripción no puede superar los 500 caracteres.");
      return;
    }

    if (consultandoHistorial) {
      setError("Espera a que termine la consulta del historial.");
      return;
    }

    const editandoConHistorial =
      Boolean(automatizacionSeleccionada) && tieneHistorial;

    if (!editandoConHistorial) {
      const errorAcciones = validarAcciones();

      if (errorAcciones) {
        setError(errorAcciones);
        return;
      }
    }

    const datos = {
      nombre,
      descripcion: formulario.descripcion.trim() || null,
      evento: formulario.evento,
      activa: formulario.activa,
    };

    if (!editandoConHistorial) {
      datos.acciones = acciones.map((accion, indice) => ({
        tipo: accion.tipo,
        configuracion: accion.configuracion,
        activa: accion.activa ?? true,
        orden: indice + 1,
      }));
    }

    setGuardando(true);

    try {
      if (automatizacionSeleccionada) {
        await actualizarAutomatizacion(automatizacionSeleccionada.id, datos);
        setMensaje("Automatización actualizada correctamente.");
      } else {
        await crearAutomatizacion(datos);
        setMensaje("Automatización creada correctamente.");
      }

      setModalAbierto(false);
      setAutomatizacionSeleccionada(null);
      await cargarAutomatizaciones();
    } catch (err) {
      setError(err.message || "No fue posible guardar la automatización.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarDesactivacion(automatizacion) {
    const confirmar = window.confirm(
      `¿Deseas desactivar la automatización "${automatizacion.nombre}"?`,
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    try {
      await desactivarAutomatizacion(automatizacion.id);
      setMensaje("Automatización desactivada correctamente.");
      await cargarAutomatizaciones();
    } catch (err) {
      setError(err.message || "No fue posible desactivar la automatización.");
    }
  }

  async function abrirHistorial(automatizacion) {
    setError("");
    setAutomatizacionHistorial(automatizacion);
    setEjecuciones([]);
    setHistorialAbierto(true);
    setCargandoEjecuciones(true);

    try {
      const respuesta = await obtenerEjecuciones(automatizacion.id);
      setEjecuciones(respuesta.data ?? []);
    } catch (err) {
      setError(err.message || "No fue posible cargar el historial.");
    } finally {
      setCargandoEjecuciones(false);
    }
  }

  return (
    <section className="automations-page">
      <header className="automations-header">
        <div>
          <h1>Automatizaciones</h1>
          <p>
            Configura acciones automáticas para los eventos de tus leads.
          </p>
        </div>

        <button
          className="automations-button automations-button-primary"
          type="button"
          onClick={() => abrirFormulario()}
        >
          + Nueva automatización
        </button>
      </header>

      {error && !modalAbierto && (
        <div className="automations-alert automations-alert-error" role="alert">
          {error}
        </div>
      )}

      {mensaje && (
        <div
          className="automations-alert automations-alert-success"
          role="status"
        >
          {mensaje}
        </div>
      )}

      <div className="automations-card">
        <div className="automations-card-header">
          <h2>Listado de automatizaciones</h2>
          <span>{automatizaciones.length} registradas</span>
        </div>

        {cargando ? (
          <p className="automations-feedback">
            Cargando automatizaciones...
          </p>
        ) : automatizaciones.length === 0 ? (
          <div className="automations-empty">
            <h3>No hay automatizaciones registradas</h3>
            <p>
              Crea una automatización para definir acciones que se ejecuten
              automáticamente.
            </p>
          </div>
        ) : (
          <div className="automations-table-container">
            <table className="automations-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Evento</th>
                  <th>Acciones</th>
                  <th>Estado</th>
                  <th>Creación</th>
                  <th>Opciones</th>
                </tr>
              </thead>
              <tbody>
                {automatizaciones.map((automatizacion) => (
                  <tr key={automatizacion.id}>
                    <td className="automations-name-cell">
                      <strong>{automatizacion.nombre}</strong>
                      {automatizacion.descripcion && (
                        <small>{automatizacion.descripcion}</small>
                      )}
                    </td>
                    <td>{etiquetaEvento(automatizacion.evento)}</td>
                    <td>
                      <div className="automations-action-tags">
                        {(automatizacion.acciones ?? []).map((accion) => (
                          <span key={accion.id}>
                            {etiquetaAccion(accion.tipo)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`automations-badge ${
                          automatizacion.activa
                            ? "automations-badge-active"
                            : "automations-badge-inactive"
                        }`}
                      >
                        {automatizacion.activa ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td>{formatearFecha(automatizacion.createdAt)}</td>
                    <td>
                      <div className="automations-actions">
                        <button
                          className="automations-button automations-button-secondary"
                          type="button"
                          onClick={() => abrirFormulario(automatizacion)}
                        >
                          Editar
                        </button>
                        <button
                          className="automations-button automations-button-secondary"
                          type="button"
                          onClick={() => abrirHistorial(automatizacion)}
                        >
                          Historial
                        </button>
                        {automatizacion.activa && (
                          <button
                            className="automations-button automations-button-danger"
                            type="button"
                            onClick={() =>
                              manejarDesactivacion(automatizacion)
                            }
                          >
                            Desactivar
                          </button>
                        )}
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
        <div className="automations-modal-overlay">
          <section
            className="automations-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="automations-modal-title"
          >
            <header className="automations-modal-header">
              <div>
                <h2 id="automations-modal-title">
                  {automatizacionSeleccionada
                    ? "Editar automatización"
                    : "Nueva automatización"}
                </h2>
                <p>
                  Define el evento que activará la automatización y sus
                  acciones.
                </p>
              </div>
              <button
                className="automations-modal-close"
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form onSubmit={manejarEnvio}>
              {error && (
                <div
                  className="automations-alert automations-alert-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="automations-form-group">
                <label htmlFor="automation-nombre">Nombre *</label>
                <input
                  id="automation-nombre"
                  name="nombre"
                  value={formulario.nombre}
                  onChange={cambiarCampo}
                  maxLength={150}
                  required
                  autoFocus
                />
              </div>

              <div className="automations-form-group">
                <label htmlFor="automation-descripcion">Descripción</label>
                <textarea
                  id="automation-descripcion"
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={cambiarCampo}
                  maxLength={500}
                  rows={2}
                />
              </div>

              <div className="automations-form-group">
                <label htmlFor="automation-evento">Evento *</label>
                <select
                  id="automation-evento"
                  name="evento"
                  value={formulario.evento}
                  onChange={cambiarCampo}
                  required
                >
                  {EVENTOS.map((evento) => (
                    <option key={evento.valor} value={evento.valor}>
                      {evento.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <label className="automations-checkbox">
                <input
                  type="checkbox"
                  name="activa"
                  checked={formulario.activa}
                  onChange={cambiarCampo}
                />
                Activar automatización al guardar
              </label>

              <div className="automations-actions-heading">
                <div>
                  <h3>Acciones</h3>
                  <p>Se ejecutarán en el orden indicado.</p>
                </div>
                {!tieneHistorial && (
                  <button
                    className="automations-button automations-button-secondary"
                    type="button"
                    onClick={agregarAccion}
                  >
                    + Agregar acción
                  </button>
                )}
              </div>

              {consultandoHistorial && (
                <p className="automations-note">
                  Consultando el historial antes de permitir cambios...
                </p>
              )}

              {tieneHistorial && (
                <p className="automations-note">
                  Esta automatización tiene ejecuciones registradas. Sus
                  acciones se muestran en modo de consulta y no se modificarán.
                </p>
              )}

              {acciones.map((accion, indice) => (
                <section className="automations-action-editor" key={indice}>
                  <header>
                    <h4>Acción {indice + 1}</h4>
                    {!tieneHistorial && acciones.length > 1 && (
                      <button
                        className="automations-link-danger"
                        type="button"
                        onClick={() => eliminarAccion(indice)}
                      >
                        Eliminar
                      </button>
                    )}
                  </header>

                  <div className="automations-form-group">
                    <label htmlFor={`automation-action-${indice}`}>
                      Tipo de acción
                    </label>
                    <select
                      id={`automation-action-${indice}`}
                      value={accion.tipo}
                      disabled={tieneHistorial || consultandoHistorial}
                      onChange={(evento) =>
                        cambiarTipoAccion(indice, evento.target.value)
                      }
                    >
                      {TIPOS_ACCION.map((tipo) => (
                        <option key={tipo.valor} value={tipo.valor}>
                          {tipo.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>

                  {accion.tipo === "CREAR_TAREA" && (
                    <>
                      <div className="automations-form-group">
                        <label htmlFor={`task-title-${indice}`}>
                          Título de la tarea *
                        </label>
                        <input
                          id={`task-title-${indice}`}
                          value={accion.configuracion.titulo}
                          maxLength={150}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "titulo",
                              evento.target.value,
                            )
                          }
                          required={!tieneHistorial}
                        />
                      </div>
                      <div className="automations-form-group">
                        <label htmlFor={`task-description-${indice}`}>
                          Descripción
                        </label>
                        <textarea
                          id={`task-description-${indice}`}
                          value={accion.configuracion.descripcion}
                          maxLength={500}
                          rows={2}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "descripcion",
                              evento.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="automations-form-grid">
                        <div className="automations-form-group">
                          <label htmlFor={`task-priority-${indice}`}>
                            Prioridad
                          </label>
                          <select
                            id={`task-priority-${indice}`}
                            value={accion.configuracion.prioridad}
                            disabled={tieneHistorial}
                            onChange={(evento) =>
                              cambiarConfiguracion(
                                indice,
                                "prioridad",
                                evento.target.value,
                              )
                            }
                          >
                            {["Baja", "Media", "Alta"].map((valor) => (
                              <option key={valor} value={valor}>
                                {valor}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="automations-form-group">
                          <label htmlFor={`task-status-${indice}`}>
                            Estado
                          </label>
                          <select
                            id={`task-status-${indice}`}
                            value={accion.configuracion.estado}
                            disabled={tieneHistorial}
                            onChange={(evento) =>
                              cambiarConfiguracion(
                                indice,
                                "estado",
                                evento.target.value,
                              )
                            }
                          >
                            {["Pendiente", "En progreso", "Completada"].map(
                              (valor) => (
                                <option key={valor} value={valor}>
                                  {valor}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>
                      <div className="automations-form-group">
                        <label htmlFor={`task-date-${indice}`}>
                          Fecha límite (opcional)
                        </label>
                        <input
                          id={`task-date-${indice}`}
                          type="date"
                          value={normalizarFecha(
                            accion.configuracion.fechaLimite,
                          )}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "fechaLimite",
                              evento.target.value,
                            )
                          }
                        />
                      </div>
                    </>
                  )}

                  {accion.tipo === "CREAR_NOTIFICACION" && (
                    <>
                      <div className="automations-form-group">
                        <label htmlFor={`notification-title-${indice}`}>
                          Título de la notificación *
                        </label>
                        <input
                          id={`notification-title-${indice}`}
                          value={accion.configuracion.titulo}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "titulo",
                              evento.target.value,
                            )
                          }
                          required={!tieneHistorial}
                        />
                      </div>
                      <div className="automations-form-group">
                        <label htmlFor={`notification-message-${indice}`}>
                          Mensaje *
                        </label>
                        <textarea
                          id={`notification-message-${indice}`}
                          value={accion.configuracion.mensaje}
                          rows={3}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "mensaje",
                              evento.target.value,
                            )
                          }
                          required={!tieneHistorial}
                        />
                      </div>
                      <div className="automations-form-group">
                        <label htmlFor={`notification-type-${indice}`}>
                          Tipo *
                        </label>
                        <input
                          id={`notification-type-${indice}`}
                          value={accion.configuracion.tipo}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "tipo",
                              evento.target.value,
                            )
                          }
                          required={!tieneHistorial}
                        />
                      </div>
                    </>
                  )}

                  {accion.tipo === "ENVIAR_CORREO" && (
                    <>
                      <div className="automations-form-group">
                        <label htmlFor={`email-to-${indice}`}>
                          Destinatario *
                        </label>
                        <input
                          id={`email-to-${indice}`}
                          type="email"
                          value={accion.configuracion.destinatario}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "destinatario",
                              evento.target.value,
                            )
                          }
                          required={!tieneHistorial}
                        />
                      </div>
                      <div className="automations-form-group">
                        <label htmlFor={`email-subject-${indice}`}>
                          Asunto *
                        </label>
                        <input
                          id={`email-subject-${indice}`}
                          maxLength={200}
                          value={accion.configuracion.asunto}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "asunto",
                              evento.target.value,
                            )
                          }
                          required={!tieneHistorial}
                        />
                      </div>
                      <div className="automations-form-group">
                        <label htmlFor={`email-message-${indice}`}>
                          Mensaje *
                        </label>
                        <textarea
                          id={`email-message-${indice}`}
                          maxLength={10000}
                          rows={4}
                          value={accion.configuracion.mensaje}
                          disabled={tieneHistorial}
                          onChange={(evento) =>
                            cambiarConfiguracion(
                              indice,
                              "mensaje",
                              evento.target.value,
                            )
                          }
                          required={!tieneHistorial}
                        />
                      </div>
                    </>
                  )}
                </section>
              ))}

              <footer className="automations-modal-footer">
                <button
                  className="automations-button automations-button-secondary"
                  type="button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  className="automations-button automations-button-primary"
                  type="submit"
                  disabled={guardando || consultandoHistorial}
                >
                  {guardando
                    ? "Guardando..."
                    : automatizacionSeleccionada
                      ? "Guardar cambios"
                      : "Crear automatización"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {historialAbierto && (
        <div className="automations-modal-overlay">
          <section
            className="automations-modal automations-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="automation-history-title"
          >
            <header className="automations-modal-header">
              <div>
                <h2 id="automation-history-title">Historial de ejecuciones</h2>
                <p>{automatizacionHistorial?.nombre}</p>
              </div>
              <button
                className="automations-modal-close"
                type="button"
                onClick={() => setHistorialAbierto(false)}
                aria-label="Cerrar historial"
              >
                ×
              </button>
            </header>

            {cargandoEjecuciones ? (
              <p className="automations-feedback">
                Cargando historial...
              </p>
            ) : ejecuciones.length === 0 ? (
              <div className="automations-empty">
                <h3>Sin ejecuciones registradas</h3>
                <p>Esta automatización todavía no tiene historial.</p>
              </div>
            ) : (
              <div className="automations-table-container">
                <table className="automations-table">
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Evento</th>
                      <th>Estado</th>
                      <th>Fecha del evento</th>
                      <th>Fecha de ejecución</th>
                      <th>Resultado / error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ejecuciones.map((ejecucion) => (
                      <tr key={ejecucion.id}>
                        <td>{ejecucion.leadId}</td>
                        <td>{ejecucion.claveEvento}</td>
                        <td>
                          <span
                            className={`automations-badge automations-execution-${String(
                              ejecucion.estado,
                            )
                              .toLowerCase()
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")}`}
                          >
                            {ejecucion.estado}
                          </span>
                        </td>
                        <td>{formatearFecha(ejecucion.fechaEvento)}</td>
                        <td>{formatearFecha(ejecucion.fechaEjecucion)}</td>
                        <td>
                          {ejecucion.mensajeError ||
                            ejecucion.resultado ||
                            "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <footer className="automations-modal-footer">
              <button
                className="automations-button automations-button-secondary"
                type="button"
                onClick={() => setHistorialAbierto(false)}
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

export default Automations;
