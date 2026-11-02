
import { useEffect, useRef, useState } from "react";

import { listarMensajesComerciales } from "../../services/chat-commercial.service.js";

const LIMITE_MENSAJES = 20;

function validarPagina(data) {
  if (
    !data ||
    !Array.isArray(data.messages) ||
    !data.messages.every(
      (mensaje) =>
        Number.isSafeInteger(mensaje?.id) &&
        mensaje.id > 0 &&
        Number.isSafeInteger(mensaje.conversationId) &&
        mensaje.conversationId > 0 &&
        typeof mensaje.contenido === "string",
    ) ||
    (data.nextCursor !== null &&
      (!Number.isSafeInteger(data.nextCursor) ||
        data.nextCursor <= 0))
  ) {
    throw new Error("Respuesta de mensajes comerciales inválida.");
  }

  return data;
}

function formatearFecha(valor) {
  if (!valor) return null;

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? null
    : fecha.toLocaleString();
}

function ChatCommercialMessages({ conversationId }) {
  const [mensajes, setMensajes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [cargandoAnteriores, setCargandoAnteriores] =
    useState(false);

  const solicitudAnterioresRef = useRef(false);
  const versionRef = useRef(0);

  useEffect(() => {
    let activo = true;

    versionRef.current += 1;
    solicitudAnterioresRef.current = false;

    async function cargarMensajes() {
      setEstado("cargando");
      setError("");
      setMensajes([]);
      setCursor(null);
      setCargandoAnteriores(false);

      try {
        const data = validarPagina(
          await listarMensajesComerciales(conversationId, {
            limit: LIMITE_MENSAJES,
          }),
        );

        if (!activo) return;

        const mensajesValidos = data.messages.filter(
          (mensaje) =>
            Number(mensaje.conversationId) ===
            Number(conversationId),
        );

        if (mensajesValidos.length !== data.messages.length) {
          throw new Error(
            "Los mensajes no pertenecen a la conversación.",
          );
        }

        setMensajes([...mensajesValidos].reverse());
        setCursor(data.nextCursor);
        setEstado("disponible");
      } catch (err) {
        if (!activo) return;

        setError(
          err.message ||
            "No fue posible consultar los mensajes comerciales.",
        );
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
        await listarMensajesComerciales(conversationId, {
          limit: LIMITE_MENSAJES,
          cursor,
        }),
      );

      if (version !== versionRef.current) return;

      if (
        data.messages.some(
          (mensaje) =>
            Number(mensaje.conversationId) !==
            Number(conversationId),
        )
      ) {
        throw new Error(
          "Los mensajes no pertenecen a la conversación.",
        );
      }

      setMensajes((actuales) => {
        const ids = new Set(
          actuales.map((mensaje) => mensaje.id),
        );

        const anteriores = [...data.messages]
          .reverse()
          .filter((mensaje) => !ids.has(mensaje.id));

        return [...anteriores, ...actuales];
      });

      setCursor(data.nextCursor);
    } catch (err) {
      if (version !== versionRef.current) return;

      setError(
        err.message ||
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
      className="chat-commercial-detail__card"
      aria-label="Historial comercial"
    >
      <h2>Historial de mensajes</h2>

      {estado === "cargando" && (
        <p role="status">Cargando mensajes comerciales...</p>
      )}

      {estado === "error" && (
        <div role="alert">
          <p>{error}</p>

          <button
            type="button"
            className="chat-commercial-detail__button"
            onClick={() => {
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
              type="button"
              className="chat-commercial-detail__button"
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
            <p>
              Todavía no hay mensajes en esta conversación.
            </p>
          ) : (
            <ol className="chat-commercial-detail__messages">
              {mensajes.map((mensaje) => (
                <li
                  key={mensaje.id}
                  className="chat-commercial-detail__message"
                >
                  <span className="chat-commercial-detail__sender">
                    Participante #{mensaje.participantId}
                  </span>

                  <p>
                    {mensaje.deletedAt
                      ? "Mensaje eliminado"
                      : mensaje.contenido}
                  </p>

                  {formatearFecha(mensaje.createdAt) && (
                    <time dateTime={mensaje.createdAt}>
                      {formatearFecha(mensaje.createdAt)}
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

export default ChatCommercialMessages;
