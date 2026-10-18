import "./Tasks.css";
import { useEffect, useState } from "react";
import {
  actualizarTarea,
  crearTarea,
  eliminarTarea,
  obtenerTareas,
} from "../../services/task.service";

const FORMULARIO_INICIAL = {
  titulo: "",
  descripcion: "",
  prioridad: "Media",
  estado: "Pendiente",
  fechaLimite: "",
};

const PRIORIDADES = ["Baja", "Media", "Alta"];

const ESTADOS = ["Pendiente", "En progreso", "Completada"];

function formatearFecha(fecha) {
  if (!fecha) {
    return "Sin fecha límite";
  }

  const fechaTexto = String(fecha).slice(0, 10);
  const [anio, mes, dia] = fechaTexto.split("-").map(Number);

  const fechaLocal = new Date(anio, mes - 1, dia);

  return fechaLocal.toLocaleDateString("es-MX");
}

function convertirFechaParaFormulario(fecha) {
  if (!fecha) {
    return "";
  }

  return String(fecha).slice(0, 10);
}

function Tasks() {
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarTareas() {
    setCargando(true);
    setError("");

    try {
      const datos = await obtenerTareas();
      setTareas(datos);
    } catch (err) {
      setError(err.message || "No fue posible cargar las tareas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
  let activo = true;

  async function cargarTareasIniciales() {
    try {
      const datos = await obtenerTareas();

      if (activo) {
        setTareas(datos);
      }
    } catch (err) {
      if (activo) {
        setError(err.message || "No fue posible cargar las tareas.");
      }
    } finally {
      if (activo) {
        setCargando(false);
      }
    }
  }

  cargarTareasIniciales();

  return () => {
    activo = false;
  };
}, []);

  function abrirFormulario(tarea = null) {
    setError("");
    setMensaje("");
    setTareaSeleccionada(tarea);

    if (tarea) {
      setFormulario({
        titulo: tarea.titulo ?? "",
        descripcion: tarea.descripcion ?? "",
        prioridad: tarea.prioridad ?? "Media",
        estado: tarea.estado ?? "Pendiente",
        fechaLimite: convertirFechaParaFormulario(tarea.fechaLimite),
      });
    } else {
      setFormulario({ ...FORMULARIO_INICIAL });
    }

    setModalAbierto(true);
  }

  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setModalAbierto(false);
    setTareaSeleccionada(null);
    setFormulario({ ...FORMULARIO_INICIAL });
    setError("");
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const datos = {
      titulo: formulario.titulo.trim(),
      descripcion: formulario.descripcion.trim(),
      prioridad: formulario.prioridad,
      estado: formulario.estado,
      fechaLimite: formulario.fechaLimite || null,
    };

    if (!datos.titulo) {
      setError("El título es obligatorio.");
      return;
    }

    if (datos.titulo.length > 150) {
      setError("El título no puede superar los 150 caracteres.");
      return;
    }

    if (datos.descripcion.length > 500) {
      setError("La descripción no puede superar los 500 caracteres.");
      return;
    }

    setGuardando(true);

    try {
      if (tareaSeleccionada) {
        await actualizarTarea(tareaSeleccionada.id, datos);
        setMensaje("Tarea actualizada correctamente.");
      } else {
        await crearTarea(datos);
        setMensaje("Tarea creada correctamente.");
      }

      setModalAbierto(false);
      setTareaSeleccionada(null);
      setFormulario({ ...FORMULARIO_INICIAL });
      await cargarTareas();
    } catch (err) {
      setError(err.message || "No fue posible guardar la tarea.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminacion(tarea) {
    const confirmar = window.confirm(
      `¿Deseas eliminar la tarea "${tarea.titulo}"?`,
    );

    if (!confirmar) {
      return;
    }

    setError("");
    setMensaje("");

    try {
      await eliminarTarea(tarea.id);
      setMensaje("Tarea eliminada correctamente.");
      await cargarTareas();
    } catch (err) {
      setError(err.message || "No fue posible eliminar la tarea.");
    }
  }

  return (
    <section className="tasks-page">
      <header className="tasks-header">
        <div>
          <h1>Tareas</h1>
          <p>Organiza y da seguimiento a tus pendientes.</p>
        </div>

        <button
          className="tasks-button tasks-button-primary"
          type="button"
          onClick={() => abrirFormulario()}
        >
          + Nueva tarea
        </button>
      </header>

      {error && !modalAbierto && (
        <div className="tasks-alert tasks-alert-error" role="alert">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="tasks-alert tasks-alert-success" role="status">
          {mensaje}
        </div>
      )}

      <div className="tasks-card">
        <div className="tasks-card-header">
          <h2>Listado de tareas</h2>
          <span>{tareas.length} tareas</span>
        </div>

        {cargando ? (
          <p className="tasks-feedback">Cargando tareas...</p>
        ) : tareas.length === 0 ? (
          <div className="tasks-empty">
            <h3>No hay tareas registradas</h3>
            <p>Crea una tarea para comenzar a organizar tus pendientes.</p>
          </div>
        ) : (
          <div className="tasks-table-container">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Descripción</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Fecha límite</th>
                  <th>Responsable</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {tareas.map((tarea) => (
                  <tr key={tarea.id}>
                    <td className="tasks-title-cell">{tarea.titulo}</td>
                    <td>{tarea.descripcion || "—"}</td>
                    <td>
                      <span
                        className={`tasks-badge tasks-priority-${tarea.prioridad?.toLowerCase()}`}
                      >
                        {tarea.prioridad}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`tasks-badge tasks-status-${tarea.estado?.toLowerCase().replaceAll(" ", "-")}`}
                      >
                        {tarea.estado}
                      </span>
                    </td>
                    <td>{formatearFecha(tarea.fechaLimite)}</td>
                    <td>
                      {tarea.user
                        ? `${tarea.user.nombre} ${tarea.user.apellido ?? ""}`.trim()
                        : "—"}
                    </td>
                    <td>
                      <div className="tasks-actions">
                        <button
                          className="tasks-button tasks-button-secondary"
                          type="button"
                          onClick={() => abrirFormulario(tarea)}
                        >
                          Editar
                        </button>

                        <button
                          className="tasks-button tasks-button-danger"
                          type="button"
                          onClick={() => manejarEliminacion(tarea)}
                        >
                          Eliminar
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
        <div className="tasks-modal-overlay">
          <section
            className="tasks-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tasks-modal-title"
          >
            <header className="tasks-modal-header">
              <div>
                <h2 id="tasks-modal-title">
                  {tareaSeleccionada ? "Editar tarea" : "Nueva tarea"}
                </h2>
                <p>
                  Completa la información para{" "}
                  {tareaSeleccionada ? "actualizar" : "registrar"} la tarea.
                </p>
              </div>

              <button
                className="tasks-modal-close"
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
                <div className="tasks-alert tasks-alert-error" role="alert">
                  {error}
                </div>
              )}

              <div className="tasks-form-group">
                <label htmlFor="titulo">Título *</label>
                <input
                  id="titulo"
                  name="titulo"
                  type="text"
                  value={formulario.titulo}
                  onChange={manejarCambio}
                  maxLength={150}
                  required
                  autoFocus
                />
              </div>

              <div className="tasks-form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={manejarCambio}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="tasks-form-grid">
                <div className="tasks-form-group">
                  <label htmlFor="prioridad">Prioridad</label>
                  <select
                    id="prioridad"
                    name="prioridad"
                    value={formulario.prioridad}
                    onChange={manejarCambio}
                  >
                    {PRIORIDADES.map((prioridad) => (
                      <option key={prioridad} value={prioridad}>
                        {prioridad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tasks-form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    name="estado"
                    value={formulario.estado}
                    onChange={manejarCambio}
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="tasks-form-group">
                <label htmlFor="fechaLimite">Fecha límite</label>
                <input
                  id="fechaLimite"
                  name="fechaLimite"
                  type="date"
                  value={formulario.fechaLimite}
                  onChange={manejarCambio}
                />
              </div>

              <footer className="tasks-modal-footer">
                <button
                  className="tasks-button tasks-button-secondary"
                  type="button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  className="tasks-button tasks-button-primary"
                  type="submit"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : tareaSeleccionada
                      ? "Guardar cambios"
                      : "Crear tarea"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default Tasks;