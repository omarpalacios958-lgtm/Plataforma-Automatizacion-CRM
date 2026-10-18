import { useEffect, useState } from "react";

import {
  actualizarLead,
  crearLead,
  eliminarLead,
  obtenerLeads,
} from "../../services/lead.service";
import { obtenerContactos } from "../../services/contact.service";

import "./Leads.css";

const ESTADOS = [
  "Nuevo",
  "Contactado",
  "Calificado",
  "Convertido",
  "Perdido",
];

const PRIORIDADES = ["Baja", "Media", "Alta"];

const formularioInicial = {
  titulo: "",
  descripcion: "",
  contactId: "",
  estado: "",
  origen: "",
  prioridad: "",
  valorEstimado: "",
  fechaSeguimiento: "",
};

function Leads() {
  const [leads, setLeads] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [leadEditando, setLeadEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        const [datosLeads, datosContactos] = await Promise.all([
          obtenerLeads(),
          obtenerContactos(),
        ]);

        if (!activo) return;

        setLeads(datosLeads);
        setContactos(datosContactos);
      } catch (err) {
        if (!activo) return;
        setError(err.message);
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  function manejarCambio(event) {
    const { name, value } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function abrirFormulario() {
    setFormulario(formularioInicial);
    setLeadEditando(null);
    setModoEdicion(false);
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  }

  function abrirEdicion(lead) {
    setFormulario({
      titulo: lead.titulo || "",
      descripcion: lead.descripcion || "",
      contactId: lead.contactId ? String(lead.contactId) : "",
      estado: lead.estado || "",
      origen: lead.origen || "",
      prioridad: lead.prioridad || "",
      valorEstimado:
        lead.valorEstimado !== null && lead.valorEstimado !== undefined
          ? String(lead.valorEstimado)
          : "",
      fechaSeguimiento: lead.fechaSeguimiento
        ? new Date(lead.fechaSeguimiento).toISOString().split("T")[0]
        : "",
    });

    setLeadEditando(lead);
    setModoEdicion(true);
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (guardando) return;

    setFormulario(formularioInicial);
    setLeadEditando(null);
    setModoEdicion(false);
    setMostrarFormulario(false);
  }

  async function manejarEnvio(event) {
    event.preventDefault();

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const datos = {
        ...formulario,
        contactId: Number(formulario.contactId),
        valorEstimado:
          formulario.valorEstimado === ""
            ? undefined
            : Number(formulario.valorEstimado),
        fechaSeguimiento:
          formulario.fechaSeguimiento === ""
            ? undefined
            : new Date(`${formulario.fechaSeguimiento}T00:00:00`).toISOString(),
      };

      if (modoEdicion && leadEditando) {
        await actualizarLead(leadEditando.id, datos);
        setMensaje("Lead actualizado correctamente.");
      } else {
        await crearLead(datos);
        setMensaje("Lead creado correctamente.");
      }

      setFormulario(formularioInicial);
      setLeadEditando(null);
      setModoEdicion(false);
      setMostrarFormulario(false);

      const datosActualizados = await obtenerLeads();
      setLeads(datosActualizados);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminacion(lead) {
    const confirmar = window.confirm(
      `¿Está seguro de eliminar el lead "${lead.titulo}"?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminando(lead.id);
      setError("");
      setMensaje("");

      await eliminarLead(lead.id);

      setLeads((anteriores) =>
        anteriores.filter((item) => item.id !== lead.id),
      );

      setMensaje("Lead eliminado correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(null);
    }
  }

  if (cargando) {
    return (
      <section className="leads-page">
        <div className="leads-loading">
          <div className="leads-loading-spinner" />
          <p>Cargando leads...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="leads-page">
      <header className="leads-header">
        <div>
          <h1>Leads</h1>
          <p>Gestiona y da seguimiento a tus oportunidades comerciales.</p>
        </div>

        <button
          type="button"
          className="leads-primary-button"
          onClick={abrirFormulario}
        >
          <span className="leads-button-icon">+</span>
          Nuevo lead
        </button>
      </header>

      {mensaje && (
        <div className="leads-alert leads-alert-success" role="status">
          <span className="leads-alert-icon">✓</span>
          <span>{mensaje}</span>
        </div>
      )}

      {error && (
        <div className="leads-alert leads-alert-error" role="alert">
          <span className="leads-alert-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="leads-table-card">
        <div className="leads-table-header">
          <div>
            <h2>Listado de leads</h2>
            <p>
              {leads.length === 1
                ? "1 lead registrado"
                : `${leads.length} leads registrados`}
            </p>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="leads-empty">
            <div className="leads-empty-icon">+</div>
            <h3>No hay leads registrados</h3>
            <p>
              Comienza agregando un nuevo lead para gestionar tus
              oportunidades comerciales.
            </p>

            <button
              type="button"
              className="leads-primary-button"
              onClick={abrirFormulario}
            >
              Nuevo lead
            </button>
          </div>
        ) : (
          <div className="leads-table-wrapper">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Contacto</th>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Valor estimado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="leads-title-cell">
                        <span className="leads-title">
                          {lead.titulo}
                        </span>

                        {lead.origen && (
                          <span className="leads-origin">
                            {lead.origen}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="leads-primary-text">
                        {lead.contact
                          ? `${lead.contact.nombre} ${
                              lead.contact.apellido || ""
                            }`.trim()
                          : "Sin contacto"}
                      </span>
                    </td>

                    <td>
                      <span className="leads-secondary-text">
                        {lead.contact?.company?.nombre || "Sin empresa"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`leads-badge leads-status-${(
                          lead.estado || "sin-estado"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {lead.estado || "Sin estado"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`leads-badge leads-priority-${(
                          lead.prioridad || "sin-prioridad"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {lead.prioridad || "Sin prioridad"}
                      </span>
                    </td>

                    <td>
                      <span className="leads-value">
                        {lead.valorEstimado !== null &&
                        lead.valorEstimado !== undefined
                          ? `$${Number(
                              lead.valorEstimado,
                            ).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "Sin valor"}
                      </span>
                    </td>

                    <td>
                      <div className="leads-actions">
                        <button
                          type="button"
                          className="leads-action-button leads-edit-button"
                          onClick={() => abrirEdicion(lead)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="leads-action-button leads-delete-button"
                          onClick={() => manejarEliminacion(lead)}
                          disabled={eliminando === lead.id}
                        >
                          {eliminando === lead.id
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

      {mostrarFormulario && (
        <div className="leads-modal-overlay">
          <div
            className="leads-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leads-modal-title"
          >
            <div className="leads-modal-header">
              <div>
                <h2 id="leads-modal-title">
                  {modoEdicion ? "Editar lead" : "Nuevo lead"}
                </h2>

                <p>
                  {modoEdicion
                    ? "Actualiza la información del lead seleccionado."
                    : "Registra una nueva oportunidad comercial."}
                </p>
              </div>

              <button
                type="button"
                className="leads-modal-close"
                onClick={cerrarFormulario}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form className="leads-form" onSubmit={manejarEnvio}>
              <div className="leads-form-grid">
                <div className="leads-form-group leads-form-full">
                  <label htmlFor="titulo">Título *</label>
                  <input
                    id="titulo"
                    name="titulo"
                    type="text"
                    value={formulario.titulo}
                    onChange={manejarCambio}
                    maxLength={150}
                    required
                    placeholder="Ej. Seguimiento de propuesta comercial"
                  />
                </div>

                <div className="leads-form-group leads-form-full">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={manejarCambio}
                    maxLength={1000}
                    placeholder="Describe brevemente la oportunidad comercial..."
                    rows={4}
                  />
                </div>

                <div className="leads-form-group leads-form-full">
                  <label htmlFor="contactId">Contacto *</label>
                  <select
                    id="contactId"
                    name="contactId"
                    value={formulario.contactId}
                    onChange={manejarCambio}
                    required
                  >
                    <option value="">Selecciona un contacto</option>

                    {contactos.map((contacto) => (
                      <option key={contacto.id} value={contacto.id}>
                        {`${contacto.nombre} ${
                          contacto.apellido || ""
                        }`.trim()}
                        {contacto.company?.nombre
                          ? ` - ${contacto.company.nombre}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="leads-form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    name="estado"
                    value={formulario.estado}
                    onChange={manejarCambio}
                  >
                    <option value="">Selecciona un estado</option>

                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="leads-form-group">
                  <label htmlFor="prioridad">Prioridad</label>
                  <select
                    id="prioridad"
                    name="prioridad"
                    value={formulario.prioridad}
                    onChange={manejarCambio}
                  >
                    <option value="">Selecciona una prioridad</option>

                    {PRIORIDADES.map((prioridad) => (
                      <option key={prioridad} value={prioridad}>
                        {prioridad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="leads-form-group">
                  <label htmlFor="origen">Origen</label>
                  <input
                    id="origen"
                    name="origen"
                    type="text"
                    value={formulario.origen}
                    onChange={manejarCambio}
                    maxLength={100}
                    placeholder="Ej. Web, referido, llamada..."
                  />
                </div>

                <div className="leads-form-group">
                  <label htmlFor="valorEstimado">Valor estimado</label>
                  <input
                    id="valorEstimado"
                    name="valorEstimado"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.valorEstimado}
                    onChange={manejarCambio}
                    placeholder="0.00"
                  />
                </div>

                <div className="leads-form-group">
                  <label htmlFor="fechaSeguimiento">
                    Fecha de seguimiento
                  </label>
                  <input
                    id="fechaSeguimiento"
                    name="fechaSeguimiento"
                    type="date"
                    value={formulario.fechaSeguimiento}
                    onChange={manejarCambio}
                  />
                </div>
              </div>

              <div className="leads-form-footer">
                <button
                  type="button"
                  className="leads-secondary-button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="leads-primary-button"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : modoEdicion
                      ? "Actualizar lead"
                      : "Guardar lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Leads;