import { useEffect, useState } from "react";

import {
  actualizarOportunidad,
  crearOportunidad,
  eliminarOportunidad,
  obtenerOportunidades,
} from "../../services/opportunity.service";
import { obtenerLeads } from "../../services/lead.service";
import "./Opportunities.css";

const ETAPAS = [
  "Nuevo",
  "Contactado",
  "Calificado",
  "Cotización",
  "Negociación",
  "Ganado",
];

const formularioInicial = {
  nombre: "",
  descripcion: "",
  etapa: "",
  monto: "",
  fechaCierre: "",
  leadId: "",
};

function Opportunities() {
  const [oportunidades, setOportunidades] = useState([]);
  const [leads, setLeads] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [oportunidadEditando, setOportunidadEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        const [datosOportunidades, datosLeads] = await Promise.all([
          obtenerOportunidades(),
          obtenerLeads(),
        ]);

        if (!activo) return;

        setOportunidades(datosOportunidades);
        setLeads(datosLeads);
      } catch (err) {
        if (!activo) return;

        setError(err.message);
      } finally {
        if (activo) {
          setCargando(false);
        }
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
    setOportunidadEditando(null);
    setModoEdicion(false);
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  }

  function abrirEdicion(oportunidad) {
    setFormulario({
      nombre: oportunidad.nombre || "",
      descripcion: oportunidad.descripcion || "",
      etapa: oportunidad.etapa || "",
      monto:
        oportunidad.monto !== null && oportunidad.monto !== undefined
          ? String(oportunidad.monto)
          : "",
      fechaCierre: oportunidad.fechaCierre
        ? new Date(oportunidad.fechaCierre).toISOString().split("T")[0]
        : "",
      leadId: oportunidad.lead?.id ? String(oportunidad.lead.id) : "",
    });

    setOportunidadEditando(oportunidad);
    setModoEdicion(true);
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (guardando) return;

    setFormulario(formularioInicial);
    setOportunidadEditando(null);
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
        leadId: Number(formulario.leadId),
        monto:
          formulario.monto === ""
            ? undefined
            : Number(formulario.monto),
        fechaCierre:
          formulario.fechaCierre === ""
            ? undefined
            : new Date(`${formulario.fechaCierre}T00:00:00`).toISOString(),
      };

      if (modoEdicion && oportunidadEditando) {
        await actualizarOportunidad(oportunidadEditando.id, datos);

        setMensaje("Oportunidad actualizada correctamente.");
      } else {
        await crearOportunidad(datos);

        setMensaje("Oportunidad creada correctamente.");
      }

      setFormulario(formularioInicial);
      setOportunidadEditando(null);
      setModoEdicion(false);
      setMostrarFormulario(false);

      const datosActualizados = await obtenerOportunidades();

      setOportunidades(datosActualizados);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminacion(oportunidad) {
    const confirmar = window.confirm(
      `¿Está seguro de eliminar la oportunidad "${oportunidad.nombre}"?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminando(oportunidad.id);
      setError("");
      setMensaje("");

      await eliminarOportunidad(oportunidad.id);

      setOportunidades((anteriores) =>
        anteriores.filter((item) => item.id !== oportunidad.id),
      );

      setMensaje("Oportunidad eliminada correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(null);
    }
  }

  if (cargando) {
    return (
      <section className="opportunities-page">
        <p>Cargando oportunidades...</p>
      </section>
    );
  }

  return (
    <section className="opportunities-page">
      <header className="opportunities-header">
        <div>
          <h1>Oportunidades</h1>

          <p>
            Gestiona y da seguimiento a tus oportunidades comerciales.
          </p>
        </div>

        <button
          type="button"
          className="opportunities-primary-button"
          onClick={abrirFormulario}
        >
          + Nueva oportunidad
        </button>
      </header>

      {mensaje && (
        <div className="opportunities-message" role="status">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="opportunities-error" role="alert">
          {error}
        </div>
      )}

      <div className="opportunities-card">
        <div className="opportunities-card-header">
          <div>
            <h2>Listado de oportunidades</h2>

            <p>
              {oportunidades.length === 1
                ? "1 oportunidad registrada"
                : `${oportunidades.length} oportunidades registradas`}
            </p>
          </div>
        </div>

        {oportunidades.length === 0 ? (
          <div className="opportunities-empty">
            <h3>No hay oportunidades registradas</h3>

            <p>
              Comienza agregando una nueva oportunidad comercial.
            </p>

            <button
              type="button"
              className="opportunities-primary-button"
              onClick={abrirFormulario}
            >
              Nueva oportunidad
            </button>
          </div>
        ) : (
          <div className="opportunities-table-wrapper">
            <table className="opportunities-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Lead</th>
                  <th>Contacto</th>
                  <th>Empresa</th>
                  <th>Etapa</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {oportunidades.map((oportunidad) => (
                  <tr key={oportunidad.id}>
                    <td className="opportunities-name">
                      {oportunidad.nombre}
                    </td>

                    <td>
                      {oportunidad.lead?.titulo || (
                        <span className="opportunities-secondary-text">
                          Sin Lead
                        </span>
                      )}
                    </td>

                    <td>
                      {oportunidad.lead?.contact
                        ? `${oportunidad.lead.contact.nombre} ${
                            oportunidad.lead.contact.apellido || ""
                          }`.trim()
                        : (
                          <span className="opportunities-secondary-text">
                            Sin contacto
                          </span>
                        )}
                    </td>

                    <td>
                      {oportunidad.lead?.contact?.company?.nombre || (
                        <span className="opportunities-secondary-text">
                          Sin empresa
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="opportunities-stage">
                        {oportunidad.etapa || "Sin etapa"}
                      </span>
                    </td>

                    <td className="opportunities-amount">
                      {oportunidad.monto !== null &&
                      oportunidad.monto !== undefined
                        ? `$${Number(
                            oportunidad.monto,
                          ).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : (
                          <span className="opportunities-secondary-text">
                            Sin monto
                          </span>
                        )}
                    </td>

                    <td>
                      <div className="opportunities-actions">
                        <button
                          type="button"
                          className="opportunities-action-button"
                          onClick={() => abrirEdicion(oportunidad)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="opportunities-action-button opportunities-action-button--danger"
                          onClick={() =>
                            manejarEliminacion(oportunidad)
                          }
                          disabled={eliminando === oportunidad.id}
                        >
                          {eliminando === oportunidad.id
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
        <div className="opportunities-modal-overlay">
          <div
            className="opportunities-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="opportunity-modal-title"
          >
            <div className="opportunities-modal-header">
              <h2 id="opportunity-modal-title">
                {modoEdicion
                  ? "Editar oportunidad"
                  : "Nueva oportunidad"}
              </h2>

              <p>
                {modoEdicion
                  ? "Actualiza la información de la oportunidad seleccionada."
                  : "Registra una nueva oportunidad comercial."}
              </p>

              <button
                type="button"
                className="opportunities-close-button"
                onClick={cerrarFormulario}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form
              className="opportunities-form"
              onSubmit={manejarEnvio}
            >
              <div className="opportunities-form-grid">
                <div className="opportunities-form-group">
                  <label htmlFor="nombre">
                    Nombre *
                  </label>

                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={formulario.nombre}
                    onChange={manejarCambio}
                    maxLength={150}
                    required
                    placeholder="Ej. Implementación de CRM"
                  />
                </div>

                <div className="opportunities-form-group">
                  <label htmlFor="leadId">
                    Lead *
                  </label>

                  <select
                    id="leadId"
                    name="leadId"
                    value={formulario.leadId}
                    onChange={manejarCambio}
                    required
                  >
                    <option value="">
                      Selecciona un Lead
                    </option>

                    {leads.map((lead) => {
                      const contacto = lead.contact
                        ? `${lead.contact.nombre} ${
                            lead.contact.apellido || ""
                          }`.trim()
                        : "Sin contacto";

                      const empresa =
                        lead.contact?.company?.nombre ||
                        "Sin empresa";

                      return (
                        <option key={lead.id} value={lead.id}>
                          {`${lead.titulo} - ${contacto} - ${empresa}`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="opportunities-form-group opportunities-form-group--full">
                  <label htmlFor="descripcion">
                    Descripción
                  </label>

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

                <div className="opportunities-form-group">
                  <label htmlFor="etapa">
                    Etapa
                  </label>

                  <select
                    id="etapa"
                    name="etapa"
                    value={formulario.etapa}
                    onChange={manejarCambio}
                  >
                    <option value="">
                      Selecciona una etapa
                    </option>

                    {ETAPAS.map((etapa) => (
                      <option key={etapa} value={etapa}>
                        {etapa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="opportunities-form-group">
                  <label htmlFor="monto">
                    Monto
                  </label>

                  <input
                    id="monto"
                    name="monto"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.monto}
                    onChange={manejarCambio}
                    placeholder="0.00"
                  />
                </div>

                <div className="opportunities-form-group">
                  <label htmlFor="fechaCierre">
                    Fecha de cierre
                  </label>

                  <input
                    id="fechaCierre"
                    name="fechaCierre"
                    type="date"
                    value={formulario.fechaCierre}
                    onChange={manejarCambio}
                  />
                </div>
              </div>

              <div className="opportunities-form-actions">
                <button
                  type="button"
                  className="opportunities-secondary-button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="opportunities-primary-button"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : modoEdicion
                      ? "Actualizar oportunidad"
                      : "Guardar oportunidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Opportunities;