
import { useEffect, useRef, useState } from "react";
import { listarMensajesVisitante } from "../../services/chat-visitor.service.js";
import ChatVisitorMessageForm from "./ChatVisitorMessageForm.jsx";

const LIMITE_MENSAJES = 20;
const INTERVALO_ACTUALIZACION = 5000;

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
      (!Number.isSafeInteger(data.nextCursor) || data.nextCursor <= 0))
  ) {
    throw new Error("Respuesta de mensajes invalida.");
  }

  return data;
}

function unirMensajes(actuales, nuevos) {
  const porId = new Map(
    actuales.map((mensaje) => [mensaje.id, mensaje]),
  );

  for (const mensaje of nuevos) {
    porId.set(mensaje.id, mensaje);
  }

  return [...porId.values()].sort((a, b) => a.id - b.id);
}

function ChatVisitorMessages({
  conversationId,
  estadoConversacion,
}) {
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
    let cargaInicialCompletada = false;
    let actualizando = false;
    let ultimoIdConfirmado = 0;

    versionRef.current += 1;
    solicitudAnterioresRef.current = false;

    const version = versionRef.current;

    function solicitudVigente() {
      return activo && version === versionRef.current;
    }

    async function cargarMensajes() {
      setEstado("cargando");
      setError("");
      setMensajes([]);
      setCursor(null);
      setCargandoAnteriores(false);

      try {
        const data = validarPagina(
          await listarMensajesVisitante(conversationId, {
            limit: LIMITE_MENSAJES,
          }),
        );

        if (!solicitudVigente()) return;

        ultimoIdConfirmado = data.messages.reduce(
          (maximo, mensaje) => Math.max(maximo, mensaje.id),
          0,
        );

        setMensajes([...data.messages].reverse());
        setCursor(data.nextCursor);
        setEstado("disponible");
        cargaInicialCompletada = true;
      } catch {
        if (!solicitudVigente()) return;

        setError("No fue posible consultar los mensajes.");
        setEstado("error");
      }
    }

    async function actualizarMensajes() {
      if (
        !solicitudVigente() ||
        !cargaInicialCompletada ||
        actualizando
      ) {
        return;
      }

      actualizando = true;

      try {
        let afterId = ultimoIdConfirmado;
        let hayMas = true;

        while (hayMas && solicitudVigente()) {
          const data = validarPagina(
            await listarMensajesVisitante(conversationId, {
              limit: LIMITE_MENSAJES,
              afterId,
            }),
          );

          if (!solicitudVigente()) return;

          if (data.messages.length === 0) {
            if (data.nextCursor !== null) {
              throw new Error(
                "Paginacion incremental invalida.",
              );
            }

            break;
          }

          const ultimoIdPagina = data.messages.reduce(
            (maximo, mensaje) => Math.max(maximo, mensaje.id),
            afterId,
          );

          if (ultimoIdPagina <= afterId) {
            throw new Error(
              "La paginacion incremental no avanzo.",
            );
          }

          afterId = ultimoIdPagina;
          ultimoIdConfirmado = ultimoIdPagina;

          setMensajes((actuales) =>
            unirMensajes(actuales, data.messages),
          );

          hayMas = data.nextCursor !== null;
        }
      } catch {
        // Conserva el historial visible ante errores temporales.
        // El siguiente intervalo reintenta desde el ultimo ID confirmado.
      } finally {
        actualizando = false;
      }
    }

    void cargarMensajes();

    const intervalo = setInterval(() => {
      void actualizarMensajes();
    }, INTERVALO_ACTUALIZACION);

    return () => {
      activo = false;
      versionRef.current += 1;
      clearInterval(intervalo);
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

      setMensajes((actuales) =>
        unirMensajes(actuales, data.messages),
      );

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

  function agregarMensajeEnviado(mensaje) {
    if (
      !mensaje ||
      Number(mensaje.conversationId) !== Number(conversationId)
    ) {
      return;
    }

    setMensajes((actuales) =>
      unirMensajes(actuales, [mensaje]),
    );
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
            <p>
  Todavía no hay mensajes en esta conversación.
</p>
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
                      {new Date(
                        mensaje.createdAt,
                      ).toLocaleString()}
                    </time>
                  )}
                </li>
              ))}
            </ol>
          )}

          {estadoConversacion === "RESUELTA" ? (
            <p role="status">
              Esta conversación ha sido resuelta.
              Puedes consultar el historial, pero ya no enviar mensajes.
            </p>
          ) : (
            <ChatVisitorMessageForm
              conversationId={conversationId}
              onMensajeEnviado={agregarMensajeEnviado}
            />
          )}
        </>
      )}
    </section>
  );
}

export default ChatVisitorMessages;
