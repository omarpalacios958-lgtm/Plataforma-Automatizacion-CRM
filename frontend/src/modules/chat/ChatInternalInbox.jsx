
import { useEffect, useState } from "react";
import { listarConversacionesInternas } from "../../services/chat-internal.service.js";
import "./ChatInternalInbox.css";
import { Link } from "react-router-dom";

function nombreEmpleado(participante) {
  const nombre = [
    participante.user?.nombre,
    participante.user?.apellido,
  ].filter(Boolean).join(" ").trim();

  return nombre || `Empleado #${participante.userId}`;
}

function nombreConversacion(conversacion) {
  if (conversacion.nombre?.trim()) {
    return conversacion.nombre;
  }

  if (conversacion.tipo === "INTERNO_PRIVADO") {
    const nombres = (conversacion.participants || [])
      .map(nombreEmpleado);

    return nombres.length > 0
      ? nombres.join(" / ")
      : `Conversación #${conversacion.id}`;
  }

  return `Grupo #${conversacion.id}`;
}

function ChatInternalInbox() {
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setCargando(true);
      setError("");

      try {
        const resultado = await listarConversacionesInternas();

        if (!vigente) return;

        if (
          !resultado ||
          !Array.isArray(resultado.conversations)
        ) {
          throw new Error(
            "Respuesta de conversaciones internas no válida.",
          );
        }

        setConversaciones(resultado.conversations);
      } catch (err) {
        if (!vigente) return;

        setConversaciones([]);
        setError(
          err.message ||
            "No fue posible cargar las conversaciones internas.",
        );
      } finally {
        if (vigente) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      vigente = false;
    };
  }, [version]);

  return (
    <section className="chat-internal">
      <header className="chat-internal__header">
        <div>
          <h1>Chat interno</h1>
          <p>
            Consulta las conversaciones privadas y grupales
            entre empleados.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVersion((actual) => actual + 1)}
          disabled={cargando}
        >
          Actualizar
        </button>
      </header>

      {error && (
        <p className="chat-internal__error" role="alert">
          {error}
        </p>
      )}

      {cargando ? (
        <p role="status">Cargando conversaciones internas...</p>
      ) : error ? null : conversaciones.length === 0 ? (
        <p>No tienes conversaciones internas disponibles.</p>
      ) : (
        <div className="chat-internal__table-wrapper">
          <table className="chat-internal__table">
            <thead>
              <tr>
                <th>Conversación</th>
                <th>Tipo</th>
                <th>Participantes</th>
                <th>Estado</th>
                <th>Actualización</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conversaciones.map((conversacion) => (
                <tr key={conversacion.id}>
                  <td>
                    <Link to={`/chat/interno/${conversacion.id}`}>
                      Ver mensajes
                    </Link>
                   </td>
                  <td>{nombreConversacion(conversacion)}</td>
                  <td>
                    {conversacion.tipo === "INTERNO_PRIVADO"
                      ? "Privada"
                      : "Grupal"}
                  </td>
                  <td>
                    {(conversacion.participants || [])
                      .map(nombreEmpleado)
                      .join(", ") || "Sin participantes"}
                  </td>
                  <td>{conversacion.estado}</td>
                  <td>
                    {conversacion.updatedAt
                      ? new Date(
                          conversacion.updatedAt,
                        ).toLocaleString()
                      : "Sin fecha"}
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

export default ChatInternalInbox;
