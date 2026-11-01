
import { useEffect, useState } from "react";
import {
  listarConversacionesComerciales,
  listarMisConversacionesComerciales,
} from "../../services/chat-commercial.service";
import "./ChatCommercialInbox.css";

const ESTADOS = [
  "PENDIENTE",
  "ASIGNADA",
  "EN_CURSO",
  "RESUELTA",
];

function ChatCommercialInbox() {
  const [vista, setVista] = useState("todas");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(0);
  const [cursores, setCursores] = useState([null]);
  const [conversaciones, setConversaciones] = useState([]);
  const [siguienteCursor, setSiguienteCursor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setCargando(true);
      setError("");
      setConversaciones([]);
      setSiguienteCursor(null);

      try {
        const consultar =
          vista === "mias"
            ? listarMisConversacionesComerciales
            : listarConversacionesComerciales;

        const resultado = await consultar({
          limit: 20,
          ...(cursores[pagina] !== null
            ? { cursor: cursores[pagina] }
            : {}),
          ...(estado ? { estado } : {}),
        });

        if (!vigente) return;

        if (
          !resultado ||
          !Array.isArray(resultado.conversations) ||
          !Object.hasOwn(resultado, "nextCursor")
        ) {
          throw new Error("Respuesta de conversaciones no válida.");
        }

        setConversaciones(resultado.conversations);
        setSiguienteCursor(resultado.nextCursor);
      } catch (err) {
        if (!vigente) return;

        setError(
          err.message || "No fue posible cargar las conversaciones.",
        );
      } finally {
        if (vigente) setCargando(false);
      }
    }

    cargar();

    return () => {
      vigente = false;
    };
  }, [vista, estado, pagina, cursores, version]);

  function reiniciarConsulta(nuevaVista, nuevoEstado) {
    setVista(nuevaVista);
    setEstado(nuevoEstado);
    setPagina(0);
    setCursores([null]);
  }

  function avanzar() {
    if (siguienteCursor === null || cargando) return;

    setCursores((actual) => [
      ...actual.slice(0, pagina + 1),
      siguienteCursor,
    ]);
    setPagina((actual) => actual + 1);
  }

  function retroceder() {
    if (pagina === 0 || cargando) return;
    setPagina((actual) => actual - 1);
  }

  return (
    <section className="chat-commercial">
      <header className="chat-commercial__header">
        <div>
          <h1>Bandeja comercial</h1>
          <p>Consulta las conversaciones de clientes y prospectos.</p>
        </div>

        <button
          type="button"
          onClick={() => setVersion((actual) => actual + 1)}
          disabled={cargando}
        >
          Actualizar
        </button>
      </header>

      <div className="chat-commercial__filters">
        <label htmlFor="chat-commercial-view">
          Bandeja
        </label>
        <select
          id="chat-commercial-view"
          value={vista}
          onChange={(evento) =>
            reiniciarConsulta(evento.target.value, estado)
          }
        >
          <option value="todas">Todas las conversaciones</option>
          <option value="mias">Mis conversaciones</option>
        </select>

        <label htmlFor="chat-commercial-status">
          Estado
        </label>
        <select
          id="chat-commercial-status"
          value={estado}
          onChange={(evento) =>
            reiniciarConsulta(vista, evento.target.value)
          }
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="chat-commercial__error" role="alert">
          {error}
        </p>
      )}

      {cargando ? (
        <p role="status">Cargando conversaciones...</p>
      ) : error ? null : conversaciones.length === 0 ? (
        <p>No hay conversaciones para los filtros seleccionados.</p>
      ) : (
        <div className="chat-commercial__table-wrapper">
          <table className="chat-commercial__table">
            <thead>
              <tr>
                <th>Conversación</th>
                <th>Estado</th>
                <th>Agente</th>
                <th>Actualización</th>
              </tr>
            </thead>
            <tbody>
              {conversaciones.map((conversacion) => (
                <tr key={conversacion.id}>
                  <td>
                    {conversacion.nombre ||
                      `Conversación #${conversacion.id}`}
                  </td>
                  <td>{conversacion.estado}</td>
                  <td>
                    {conversacion.assignedAgentId === null
                      ? "Sin asignar"
                      : `Agente #${conversacion.assignedAgentId}`}
                  </td>
                  <td>
                    {conversacion.updatedAt
                      ? new Date(
                          conversacion.updatedAt,
                        ).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav
        className="chat-commercial__pagination"
        aria-label="Paginación de conversaciones"
      >
        <button
          type="button"
          onClick={retroceder}
          disabled={cargando || pagina === 0}
        >
          Anterior
        </button>

        <span>Página {pagina + 1}</span>

        <button
          type="button"
          onClick={avanzar}
          disabled={cargando || siguienteCursor === null}
        >
          Siguiente
        </button>
      </nav>
    </section>
  );
}

export default ChatCommercialInbox;
