import { useEffect, useState } from "react";
import {
  obtenerArchivos,
  subirArchivo,
  actualizarArchivo,
  eliminarArchivo,
  descargarArchivo,
} from "../../services/file.service";
import { obtenerEmpresas } from "../../services/company.service";
import { obtenerContactos } from "../../services/contact.service";
import { obtenerLeads } from "../../services/lead.service";
import { obtenerOportunidades } from "../../services/opportunity.service";
import "./Files.css";

const FORMULARIO_INICIAL = {
  nombre: "",
  entidad: "companies",
  entidadId: "",
  archivo: null,
};

const ENTIDADES = [
  { valor: "companies", etiqueta: "Empresa", campo: "companyId" },
  { valor: "contacts", etiqueta: "Contacto", campo: "contactId" },
  { valor: "leads", etiqueta: "Lead", campo: "leadId" },
  {
    valor: "opportunities",
    etiqueta: "Oportunidad",
    campo: "opportunityId",
  },
];

const CONSULTAS_ENTIDAD = {
  companies: obtenerEmpresas,
  contacts: obtenerContactos,
  leads: obtenerLeads,
  opportunities: obtenerOportunidades,
};

function obtenerEtiquetaRegistro(registro, entidad) {
  const nombreCompleto = [
    registro.nombre,
    registro.apellido,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  let etiqueta = "";

  switch (entidad) {
    case "companies":
      etiqueta =
        registro.razonSocial ||
        registro.nombreComercial ||
        registro.nombre;
      break;

    case "contacts":
      etiqueta =
        nombreCompleto ||
        registro.nombreCompleto ||
        registro.correo;
      break;

    case "leads":
      etiqueta =
        nombreCompleto ||
        registro.nombreCompleto ||
        registro.titulo ||
        registro.empresa;
      break;

    case "opportunities":
      etiqueta =
        registro.nombre ||
        registro.titulo ||
        registro.descripcion;
      break;

    default:
      etiqueta = "";
  }

  return String(etiqueta || `Registro ${registro.id}`).trim();
}

function obtenerNombreUsuario(archivo) {
  if (!archivo.user) return "—";

  return [archivo.user.nombre, archivo.user.apellido]
    .filter(Boolean)
    .join(" ");
}

function obtenerEntidadArchivo(archivo) {
  const entidad = ENTIDADES.find(({ campo }) => archivo[campo]);

  if (!entidad) {
    return { etiqueta: "Sin asociación", id: "" };
  }

  const registro = archivo[entidad.valor.slice(0, -1)];

  return {
    etiqueta: entidad.etiqueta,
    id: archivo[entidad.campo],
    nombre:
      registro?.nombre ||
      registro?.titulo ||
      registro?.razonSocial ||
      "",
  };
}

function Files() {
  const [archivos, setArchivos] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registrosAsociables, setRegistrosAsociables] = useState([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(false);
  const [errorRegistros, setErrorRegistros] = useState("");

  async function cargarArchivos() {
    setCargando(true);
    setError("");

    try {
      const datos = await obtenerArchivos();
      setArchivos(Array.isArray(datos) ? datos : []);
    } catch (err) {
      setError(err.message || "No fue posible cargar los archivos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    async function iniciarCarga() {
      await cargarArchivos();
    }

    iniciarCarga();
  }, []);

  useEffect(() => {
    if (!modalAbierto) {
      return;
    }

    let cancelado = false;

    async function cargarRegistrosAsociables() {
      setCargandoRegistros(true);
      setErrorRegistros("");
      setRegistrosAsociables([]);

      try {
        const consultar = CONSULTAS_ENTIDAD[formulario.entidad];
        const respuesta = await consultar();

        if (cancelado) return;

        setRegistrosAsociables(
          Array.isArray(respuesta) ? respuesta : []
        );
      } catch (err) {
        if (cancelado) return;

        setErrorRegistros(
          err.message ||
            "No fue posible consultar los registros."
        );
      } finally {
        if (!cancelado) {
          setCargandoRegistros(false);
        }
      }
    }

    cargarRegistrosAsociables();

    return () => {
      cancelado = true;
    };
  }, [modalAbierto, formulario.entidad]);

  function abrirCrear() {
    setArchivoSeleccionado(null);
    setFormulario(FORMULARIO_INICIAL);
    setError("");
    setMensajeExito("");
    setModalAbierto(true);
  }

  function abrirEditar(archivo) {
    const entidad = ENTIDADES.find(({ campo }) => archivo[campo]);

    setArchivoSeleccionado(archivo);
    setFormulario({
      nombre: archivo.nombre || "",
      entidad: entidad?.valor || "companies",
      entidadId: entidad
        ? String(archivo[entidad.campo])
        : "",
      archivo: null,
    });
    setError("");
    setMensajeExito("");
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setArchivoSeleccionado(null);
    setFormulario(FORMULARIO_INICIAL);
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
      ...(name === "entidad" ? { entidadId: "" } : {}),
    }));
  }

  function manejarArchivo(evento) {
    const archivo = evento.target.files?.[0] || null;

    setFormulario((actual) => ({
      ...actual,
      archivo,
      nombre:
        actual.nombre ||
        (archivo
          ? archivo.name.replace(/\.[^.]+$/, "")
          : ""),
    }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");
    setMensajeExito("");

    if (!formulario.nombre.trim()) {
      setError("El nombre del archivo es obligatorio.");
      return;
    }

    if (!archivoSeleccionado && !formulario.archivo) {
      setError("Selecciona un archivo para subir.");
      return;
    }

    if (!formulario.entidadId) {
      setError("Selecciona el registro al que se asociará el archivo.");
      return;
    }

    const entidad = ENTIDADES.find(
      ({ valor }) => valor === formulario.entidad,
    );

    if (!entidad) {
      setError("Selecciona una entidad válida.");
      return;
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      [entidad.campo]: Number(formulario.entidadId),
    };

    setGuardando(true);

    try {
      if (archivoSeleccionado) {
        if (formulario.archivo) {
          datos.archivo = formulario.archivo;
        }

        const entidadOriginal = ENTIDADES.find(
          ({ campo }) => archivoSeleccionado[campo],
        );

        const cambioEntidad =
          entidadOriginal?.campo !== entidad.campo ||
          String(archivoSeleccionado[entidadOriginal?.campo]) !==
            formulario.entidadId;

        if (cambioEntidad) {
          for (const opcion of ENTIDADES) {
            if (opcion.campo !== entidad.campo) {
              datos[opcion.campo] = null;
            }
          }
        }

        await actualizarArchivo(archivoSeleccionado.id, datos);
        setMensajeExito("Archivo actualizado correctamente.");
      } else {
        await subirArchivo({
          ...datos,
          entidad: formulario.entidad,
          archivo: formulario.archivo,
        });
        setMensajeExito("Archivo subido correctamente.");
      }

      setModalAbierto(false);
      setArchivoSeleccionado(null);
      setFormulario(FORMULARIO_INICIAL);
      await cargarArchivos();
      setMensajeExito(
        archivoSeleccionado
          ? "Archivo actualizado correctamente."
          : "Archivo subido correctamente.",
      );
    } catch (err) {
      setError(err.message || "No fue posible guardar el archivo.");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(archivo) {
    const confirmar = window.confirm(
      '¿Deseas eliminar el archivo "' + archivo.nombre + '"?',
    );

    if (!confirmar) return;

    setError("");
    setMensajeExito("");

    try {
      await eliminarArchivo(archivo.id);
      setMensajeExito("Archivo eliminado correctamente.");
      await cargarArchivos();
    } catch (err) {
      setError(err.message || "No fue posible eliminar el archivo.");
    }
  }

  async function manejarDescargar(archivo) {
    setError("");
    setMensajeExito("");
    setDescargandoId(archivo.id);

    try {
      const contenido = await descargarArchivo(archivo.id);

      const urlTemporal = URL.createObjectURL(contenido);

      const nombreDescarga =
        String(
          archivo.nombreOriginal ||
            `archivo-${archivo.id}.${archivo.extension || "bin"}`
        )
          .split(/[\\/]/)
          .pop() || `archivo-${archivo.id}`;

      const enlace = document.createElement("a");
      enlace.href = urlTemporal;
      enlace.download = nombreDescarga;

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      setTimeout(() => {
        URL.revokeObjectURL(urlTemporal);
      }, 1000);
    } catch (err) {
      setError(
        err.message || "No fue posible descargar el archivo."
      );
    } finally {
      setDescargandoId(null);
    }
  }

  return (
    <section className="files-page">
      <header className="files-header">
        <div>
          <h2>Archivos</h2>
          <p>Consulta y administra los archivos de tu cuenta.</p>
        </div>

        <button
          type="button"
          className="files-button files-button-primary"
          onClick={abrirCrear}
        >
          Nuevo archivo
        </button>
      </header>

      <div className="files-summary">
        <article className="files-summary-card">
          <span>Total de archivos</span>
          <strong>{archivos.length}</strong>
        </article>
      </div>

      {error && (
        <div className="files-alert files-alert-error" role="alert">
          {error}
        </div>
      )}

      {mensajeExito && (
        <div className="files-alert files-alert-success" role="status">
          {mensajeExito}
        </div>
      )}

      <section className="files-panel">
        <div className="files-panel-header">
          <h3>Listado de archivos</h3>
          <button
            type="button"
            className="files-button files-button-secondary"
            onClick={cargarArchivos}
            disabled={cargando}
          >
            Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="files-empty">Cargando archivos...</p>
        ) : archivos.length === 0 ? (
          <div className="files-empty">
            <h4>No hay archivos registrados</h4>
            <p>Sube un archivo para comenzar.</p>
          </div>
        ) : (
          <div className="files-table-container">
            <table className="files-table">
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Tipo</th>
                  <th>Tamaño</th>
                  <th>Asociación</th>
                  <th>Propietario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {archivos.map((archivo) => {
                  const entidad = obtenerEntidadArchivo(archivo);

                  return (
                    <tr key={archivo.id}>
                      <td>
                        <strong>{archivo.nombre}</strong>
                        <span className="files-secondary-text">
                          {archivo.nombreOriginal}
                        </span>
                      </td>
                      <td>{archivo.extension?.toUpperCase() || "—"}</td>
                      <td>
                        {Number.isFinite(Number(archivo.tamano))
                          ? (Number(archivo.tamano) / 1024).toFixed(1) +
                            " KB"
                          : "—"}
                      </td>
                      <td>
                        <strong>{entidad.etiqueta}</strong>
                        {entidad.id && (
                          <span className="files-secondary-text">
                            ID: {entidad.id}
                            {entidad.nombre ? " · " + entidad.nombre : ""}
                          </span>
                        )}
                      </td>
                      <td>{obtenerNombreUsuario(archivo)}</td>
                      <td>
                        <div className="files-actions">
                          <button
                            type="button"
                            className="files-action"
                            onClick={() => manejarDescargar(archivo)}
                            disabled={descargandoId === archivo.id}
                          >
                            {descargandoId === archivo.id
                              ? "Descargando..."
                              : "Descargar"}
                          </button>
                          <button
                            type="button"
                            className="files-action"
                            onClick={() => abrirEditar(archivo)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="files-action files-action-danger"
                            onClick={() => manejarEliminar(archivo)}
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
      </section>

      {modalAbierto && (
        <div
          className="files-modal-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              cerrarModal();
            }
          }}
        >
          <section
            className="files-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="files-modal-title"
          >
            <div className="files-modal-header">
              <div>
                <h3 id="files-modal-title">
                  {archivoSeleccionado ? "Editar archivo" : "Nuevo archivo"}
                </h3>
                <p>
                  {archivoSeleccionado
                    ? "Actualiza los datos o reemplaza el archivo."
                    : "Selecciona un archivo y el registro asociado."}
                </p>
              </div>
              <button
                type="button"
                className="files-modal-close"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form className="files-form" onSubmit={manejarEnvio}>
              <label>
                Nombre del archivo
                <input
                  name="nombre"
                  value={formulario.nombre}
                  onChange={manejarCambio}
                  maxLength={150}
                  required
                  placeholder="Ej. Contrato comercial"
                />
              </label>

              <label>
                Entidad asociada
                <select
                  name="entidad"
                  value={formulario.entidad}
                  onChange={manejarCambio}
                  required
                >
                  {ENTIDADES.map((entidad) => (
                    <option key={entidad.valor} value={entidad.valor}>
                      {entidad.etiqueta}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Registro asociado

                <select
                  name="entidadId"
                  value={formulario.entidadId}
                  onChange={manejarCambio}
                  disabled={cargandoRegistros || Boolean(errorRegistros)}
                  required
                >
                  <option value="">
                    {cargandoRegistros
                      ? "Cargando registros..."
                      : "Selecciona un registro"}
                  </option>

                  {registrosAsociables.map((registro) => (
                    <option key={registro.id} value={String(registro.id)}>
                      {obtenerEtiquetaRegistro(
                        registro,
                        formulario.entidad
                      )}
                    </option>
                  ))}

                  {archivoSeleccionado &&
                    formulario.entidadId &&
                    !registrosAsociables.some(
                      (registro) =>
                        String(registro.id) === formulario.entidadId
                    ) && (
                      <option value={formulario.entidadId} disabled>
                        Registro actual no disponible
                      </option>
                    )}
                </select>

                {errorRegistros ? (
                  <small role="alert">{errorRegistros}</small>
                ) : (
                  <small>
                    Selecciona el registro al que deseas asociar
                    el archivo.
                  </small>
                )}
              </label>

              <label>
                {archivoSeleccionado
                  ? "Reemplazar archivo (opcional)"
                  : "Seleccionar archivo"}
                <input
                  type="file"
                  name="archivo"
                  onChange={manejarArchivo}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  required={!archivoSeleccionado}
                />
                <small>Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS y XLSX. Máximo 10 MB.</small>
              </label>

              {formulario.archivo && (
                <p className="files-selected-file">
                  Archivo seleccionado: {formulario.archivo.name}
                </p>
              )}

              <div className="files-form-actions">
                <button
                  type="button"
                  className="files-button files-button-secondary"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="files-button files-button-primary"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : archivoSeleccionado
                      ? "Guardar cambios"
                      : "Subir archivo"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default Files;