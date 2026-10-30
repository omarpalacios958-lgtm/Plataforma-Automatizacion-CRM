
import { useEffect, useRef, useState } from "react";

import { listarMensajesVisitante } from "../../services/chat-visitor.service.js";

const LIMITE_MENSAJES = 20;

function validarPagina(data) {
  if (
    !data ||
    !Array.isArray(data.messages) ||
    !data.messages.every(
      (mensaje) =>
        Number.isSafeInteger(mensaje?.id) &&
        mensaje.id > 0 &&
        typeof mensaje.contenido === "string",
    ) ||
    (data.nextCursor !== null &&
      (!Number.isSafeInteger(data.nextCursor) ||
        data.nextCursor <= 0))
  ) {
    throw new Error("Respuesta de mensajes inválida.");
  }

  return data;
}

function ChatVisitorMessages({ conversationId }) {
  const [mensajes, setMensajes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);

  const solicitudAnterioresRef = useRef(false);
  const versionRef = useRef(0);

  useEffect(() => {
  let activo = true;
  versionRef.current += 1;
    solicitudAnterioresRef.current = false;

    async function cargarMensajes() {
      try {
        const data = validarPagina(
          await listarMensajesVisitante(conversationId, {
            limit: LIMITE_MENSAJES,
          }),
        );

        if (!activo) return;

        setMensajes([...data.messages].reverse());
        setCursor(data.nextCursor);
        setEstado("disponible");
      } catch {
        if (!activo) return;

        setError("No fue posible consultar los mensajes.");
        setEstado("error");
      }
    }

    cargarMensajes();

    return () => {
      activo = false;
      versionRef.current += 1;
    };
  }, [conversationId, intento]);

  async function cargarAnteriores() {
    if (
      solicitudAnterioresRef.current ||
      estado !== "disponible" ||
      cursor === null
    ) {
      return;
    }

    solicitudAnterioresRef.current = true;
    setCargandoAnteriores(true);
    setError("");

    const version = versionRef.current;

    try {
      const data = validarPagina(
        await listarMensajesVisitante(conversationId, {
          limit: LIMITE_MENSAJES,
          cursor,
        }),
      );

      if (version !== versionRef.current) return;

      setMensajes((actuales) => {
        const ids = new Set(actuales.map((mensaje) => mensaje.id));

        const anteriores = [...data.messages]
          .reverse()
          .filter((mensaje) => !ids.has(mensaje.id));

        return [...anteriores, ...actuales];
      });

      setCursor(data.nextCursor);
    } catch {
      if (version !== versionRef.current) return;

      setError(
        "No fue posible cargar mensajes anteriores. Puedes reintentar.",
      );
    } finally {
      if (version === versionRef.current) {
        solicitudAnterioresRef.current = false;
        setCargandoAnteriores(false);
      }
    }
  }

  return (
    <section
      className="chat-visitor__messages"
      aria-label="Historial de mensajes"
    >
      <h4>Mensajes</h4>

      {estado === "cargando" && (
        <p role="status">Cargando mensajes...</p>
      )}

      {estado === "error" && (
        <div role="alert">
          <p>{error}</p>
          <button
            className="chat-visitor__button"
            type="button"
            onClick={() => {
  setEstado("cargando");
  setError("");
  setMensajes([]);
  setCursor(null);
  setIntento((actual) => actual + 1);
}}
          >
            Reintentar mensajes
          </button>
        </div>
      )}

      {estado === "disponible" && (
        <>
          {cursor !== null && (
            <button
              className="chat-visitor__button"
              type="button"
              onClick={cargarAnteriores}
              disabled={cargandoAnteriores}
            >
              {cargandoAnteriores
                ? "Cargando anteriores..."
                : "Cargar mensajes anteriores"}
            </button>
          )}

          {error && <p role="alert">{error}</p>}

          {mensajes.length === 0 ? (
            <p>Todavía no hay mensajes en esta conversación.</p>
          ) : (
            <ol className="chat-visitor__message-list">
              {mensajes.map((mensaje) => (
                <li
                  className="chat-visitor__message"
                  key={mensaje.id}
                >
                  <p>
                    {mensaje.deletedAt
                      ? "Mensaje eliminado"
                      : mensaje.contenido}
                  </p>

                  {mensaje.createdAt && (
                    <time dateTime={mensaje.createdAt}>
                      {new Date(mensaje.createdAt).toLocaleString()}
                    </time>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

export default ChatVisitorMessages;
