
import { useEffect, useRef, useState } from "react";

import { listarMensajesComerciales } from "../../services/chat-commercial.service.js";

const LIMITE_MENSAJES = 20;
const INTERVALO_ACTUALIZACION = 5000;

function validarPagina(data, conversationId) {
  if (
    !data ||
    !Array.isArray(data.messages) ||
    !data.messages.every(
      (mensaje) =>
        Number.isSafeInteger(mensaje?.id) &&
        mensaje.id > 0 &&
        Number.isSafeInteger(mensaje.conversationId) &&
        typeof mensaje.contenido === "string",
    ) ||
    (data.nextCursor !== null &&
      (!Number.isSafeInteger(data.nextCursor) ||
        data.nextCursor <= 0))
  ) {
    throw new Error("Respuesta de mensajes comerciales inválida.");
  }

  if (
    data.messages.some(
      (mensaje) =>
        mensaje.conversationId !== Number(conversationId),
    )
  ) {
    throw new Error(
      "Los mensajes no pertenecen a la conversación.",
    );
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

function ordenarMensajes(mensajes) {
  return [...mensajes].sort((a, b) => {
    const fechaA = Date.parse(a.createdAt);
    const fechaB = Date.parse(b.createdAt);

    if (Number.isFinite(fechaA) && Number.isFinite(fechaB)) {
      const diferencia = fechaA - fechaB;

      if (diferencia !== 0) return diferencia;
    }

    return a.id - b.id;
  });
}

function unirMensajes(actuales, nuevos) {
  const porId = new Map(
    actuales.map((mensaje) => [mensaje.id, mensaje]),
  );

  for (const mensaje of nuevos) {
    porId.set(mensaje.id, mensaje);
  }

  return ordenarMensajes([...porId.values()]);
}

function ChatCommercialMessages({
  conversationId,
  mensajesEnviados = [],
}) {
  const [mensajes, setMensajes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [cargandoAnteriores, setCargandoAnteriores] =
    useState(false);

  const solicitudAnterioresRef = useRef(false);
  const versionRef = useRef(0);

  const mensajesConfirmados = mensajesEnviados.filter(
    (mensaje) =>
      Number(mensaje?.conversationId) ===
        Number(conversationId) &&
      Number.isSafeInteger(mensaje.id) &&
      mensaje.id > 0,
  );

  const mensajesVisibles = unirMensajes(
    mensajesConfirmados,
    mensajes,
  );

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
          await listarMensajesComerciales(conversationId, {
            limit: LIMITE_MENSAJES,
          }),
          conversationId,
        );

        if (!solicitudVigente()) return;

        ultimoIdConfirmado = data.messages.reduce(
          (maximo, mensaje) => Math.max(maximo, mensaje.id),
          0,
        );

        setMensajes(ordenarMensajes(data.messages));
        setCursor(data.nextCursor);
        setEstado("disponible");
        cargaInicialCompletada = true;
      } catch (err) {
        if (!solicitudVigente()) return;

        setError(
          err.message ||
            "No fue posible consultar los mensajes comerciales.",
        );
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
            await listarMensajesComerciales(conversationId, {
              limit: LIMITE_MENSAJES,
              afterId,
            }),
            conversationId,
          );

          if (!solicitudVigente()) return;

          if (data.messages.length === 0) {
            if (data.nextCursor !== null) {
              throw new Error(
                "Paginación incremental inválida.",
              );
            }

            break;
          }

          const ultimoIdPagina = data.messages.reduce(
            (maximo, mensaje) => Math.max(maximo, mensaje.id),
            afterId,
          );

          if (
            data.messages.some(
              (mensaje) => mensaje.id <= afterId,
            ) ||
            ultimoIdPagina <= afterId
          ) {
            throw new Error(
              "La paginación incremental no avanzó.",
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
        // Conserva los mensajes visibles ante errores temporales.
        // El siguiente intervalo reintenta desde el último ID
        // confirmado correctamente.
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
        await listarMensajesComerciales(conversationId, {
          limit: LIMITE_MENSAJES,
          cursor,
        }),
        conversationId,
      );

      if (version !== versionRef.current) return;

      setMensajes((actuales) =>
        unirMensajes(actuales, data.messages),
      );

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

          {mensajesVisibles.length === 0 ? (
            <p>
              Todavía no hay mensajes en esta conversación.
            </p>
          ) : (
            <ol className="chat-commercial-detail__messages">
              {mensajesVisibles.map((mensaje) => (
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
