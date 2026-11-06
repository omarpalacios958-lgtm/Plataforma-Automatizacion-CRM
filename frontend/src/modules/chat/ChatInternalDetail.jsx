
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  enviarMensajeInterno,
  listarConversacionesInternas,
  marcarComoLeidoInterno,
  obtenerMensajesInternos,
} from "../../services/chat-internal.service.js";

import useInternalMessagePolling from "./useInternalMessagePolling.js";

import "./ChatInternalDetail.css";

const LIMITE_MENSAJES = 20;
const MAX_CONTENIDO = 10000;

function validarMensaje(mensaje, conversationId) {
  return (
    mensaje &&
    Number.isSafeInteger(mensaje.id) &&
    mensaje.id > 0 &&
    mensaje.conversationId === conversationId &&
    Number.isSafeInteger(mensaje.participantId) &&
    mensaje.participantId > 0 &&
    typeof mensaje.contenido === "string"
  );
}

function validarPagina(data, conversationId) {
  if (
    !data ||
    !Array.isArray(data.messages) ||
    !data.messages.every((mensaje) =>
      validarMensaje(mensaje, conversationId),
    ) ||
    (data.nextCursor !== null &&
      (!Number.isSafeInteger(data.nextCursor) ||
        data.nextCursor <= 0))
  ) {
    throw new Error("Respuesta de mensajes internos no válida.");
  }

  return data;
}

function nombreEmpleado(participante) {
  const nombre = [
    participante.user?.nombre,
    participante.user?.apellido,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return nombre || `Empleado #${participante.userId}`;
}

function nombreConversacion(conversacion) {
  if (conversacion.nombre?.trim()) {
    return conversacion.nombre;
  }

  if (conversacion.tipo === "INTERNO_PRIVADO") {
    const nombres = conversacion.participants.map(nombreEmpleado);

    return nombres.length
      ? nombres.join(" / ")
      : `Conversación #${conversacion.id}`;
  }

  return `Grupo #${conversacion.id}`;
}

function formatearFecha(valor) {
  if (!valor) return "Sin fecha";

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? "Sin fecha"
    : fecha.toLocaleString();
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

function obtenerUltimoId(mensajes) {
  return mensajes.reduce(
    (mayor, mensaje) => Math.max(mayor, mensaje.id),
    0,
  );
}

function ChatInternalDetail() {
  const { conversationId: parametroId } = useParams();
  const conversationId = Number(parametroId);

  const [conversacion, setConversacion] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [ultimoIdInicial, setUltimoIdInicial] = useState(0);
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [errorAnteriores, setErrorAnteriores] = useState("");
  const [cargandoAnteriores, setCargandoAnteriores] =
    useState(false);
  const [intento, setIntento] = useState(0);

  const [contenido, setContenido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");

  const versionRef = useRef(0);
  const solicitudAnterioresRef = useRef(false);
  const solicitudEnvioRef = useRef(false);
  const envioPendienteRef = useRef(null);

  const lecturaRef = useRef({
    version: 0,
    conversationId: null,
    confirmado: 0,
    pendiente: 0,
    ejecutando: false,
  });

  function solicitarLectura(idConversacion, messageId, version) {
    if (
      !Number.isSafeInteger(messageId) ||
      messageId <= 0 ||
      versionRef.current !== version
    ) {
      return;
    }

    const lectura = lecturaRef.current;

    if (
      lectura.version !== version ||
      lectura.conversationId !== idConversacion
    ) {
      return;
    }

    lectura.pendiente = Math.max(
      lectura.pendiente,
      messageId,
    );

    if (
      lectura.ejecutando ||
      lectura.pendiente <= lectura.confirmado
    ) {
      return;
    }

    lectura.ejecutando = true;

    async function procesarLecturas() {
      try {
        while (
          versionRef.current === version &&
          lecturaRef.current === lectura &&
          lectura.pendiente > lectura.confirmado
        ) {
          const objetivo = lectura.pendiente;

          try {
            await marcarComoLeidoInterno(
              idConversacion,
              objetivo,
            );
          } catch {
            // El error de lectura no debe bloquear el historial.
            // Un evento posterior podrá volver a intentarlo.
            break;
          }

          if (
            versionRef.current !== version ||
            lecturaRef.current !== lectura
          ) {
            break;
          }

          lectura.confirmado = Math.max(
            lectura.confirmado,
            objetivo,
          );
        }
      } finally {
        lectura.ejecutando = false;
      }
    }

    void procesarLecturas();
  }

  useEffect(() => {
    let vigente = true;

    versionRef.current += 1;
    const version = versionRef.current;

    solicitudAnterioresRef.current = false;
    solicitudEnvioRef.current = false;
    envioPendienteRef.current = null;

    lecturaRef.current = {
      version,
      conversationId,
      confirmado: 0,
      pendiente: 0,
      ejecutando: false,
    };

    function solicitudVigente() {
      return vigente && versionRef.current === version;
    }

    async function cargar() {
      setEstado("cargando");
      setError("");
      setErrorAnteriores("");
      setConversacion(null);
      setMensajes([]);
      setCursor(null);
      setUltimoIdInicial(0);
      setCargandoAnteriores(false);

      setContenido("");
      setEnviando(false);
      setErrorEnvio("");

      if (
        !/^[1-9]\d*$/.test(parametroId) ||
        !Number.isSafeInteger(conversationId)
      ) {
        setError("Identificador de conversación inválido.");
        setEstado("error");
        return;
      }

      try {
        const resultado = await listarConversacionesInternas();

        if (!solicitudVigente()) return;

        if (
          !resultado ||
          !Array.isArray(resultado.conversations)
        ) {
          throw new Error(
            "Respuesta de conversaciones internas no válida.",
          );
        }

        const encontrada = resultado.conversations.find(
          (item) => item.id === conversationId,
        );

        if (
          !encontrada ||
          !["INTERNO_PRIVADO", "INTERNO_GRUPAL"].includes(
            encontrada.tipo,
          ) ||
          !Array.isArray(encontrada.participants)
        ) {
          throw new Error(
            "Conversación interna no encontrada.",
          );
        }

        const pagina = validarPagina(
          await obtenerMensajesInternos(conversationId, {
            limit: LIMITE_MENSAJES,
          }),
          conversationId,
        );

        if (!solicitudVigente()) return;

        const ultimoId = obtenerUltimoId(pagina.messages);

        setConversacion(encontrada);
        setMensajes(unirMensajes([], pagina.messages));
        setUltimoIdInicial(ultimoId);
        setCursor(pagina.nextCursor);
        setEstado("disponible");

        solicitarLectura(conversationId, ultimoId, version);
      } catch (err) {
        if (!solicitudVigente()) return;

        setError(
          err.message ||
            "No fue posible consultar la conversación interna.",
        );
        setEstado("error");
      }
    }

    void cargar();

    return () => {
      vigente = false;
      versionRef.current += 1;
    };
  }, [conversationId, parametroId, intento]);

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
    setErrorAnteriores("");

    const version = versionRef.current;

    try {
      const pagina = validarPagina(
        await obtenerMensajesInternos(conversationId, {
          limit: LIMITE_MENSAJES,
          cursor,
        }),
        conversationId,
      );

      if (versionRef.current !== version) return;

      if (
        pagina.messages.length === 0 &&
        pagina.nextCursor !== null
      ) {
        throw new Error("Paginación de mensajes inválida.");
      }

      if (
        pagina.messages.some(
          (mensaje) => mensaje.id >= cursor,
        )
      ) {
        throw new Error(
          "La paginación no avanzó correctamente.",
        );
      }

      setMensajes((actuales) =>
        unirMensajes(actuales, pagina.messages),
      );
      setCursor(pagina.nextCursor);
    } catch (err) {
      if (versionRef.current !== version) return;

      setErrorAnteriores(
        err.message ||
          "No fue posible cargar mensajes anteriores.",
      );
    } finally {
      if (versionRef.current === version) {
        solicitudAnterioresRef.current = false;
        setCargandoAnteriores(false);
      }
    }
  }

  function cambiarContenido(evento) {
    const nuevoContenido = evento.target.value;

    setContenido(nuevoContenido);
    setErrorEnvio("");

    if (
      envioPendienteRef.current &&
      envioPendienteRef.current.contenido !==
        nuevoContenido.trim()
    ) {
      envioPendienteRef.current = null;
    }
  }

  async function enviarMensaje(evento) {
    evento.preventDefault();

    if (
      solicitudEnvioRef.current ||
      estado !== "disponible"
    ) {
      return;
    }

    const texto = contenido.trim();

    if (!texto || contenido.length > MAX_CONTENIDO) {
      setErrorEnvio(
        "El contenido debe tener entre 1 y 10000 caracteres.",
      );
      return;
    }

    let datos = envioPendienteRef.current;

    if (!datos || datos.contenido !== texto) {
      try {
        datos = {
          contenido: texto,
          clientMessageId: crypto.randomUUID(),
        };
      } catch {
        setErrorEnvio(
          "No fue posible generar el identificador del mensaje.",
        );
        return;
      }

      envioPendienteRef.current = datos;
    }

    solicitudEnvioRef.current = true;
    setEnviando(true);
    setErrorEnvio("");

    const version = versionRef.current;

    try {
      const respuesta = await enviarMensajeInterno(
        conversationId,
        datos,
      );

      if (versionRef.current !== version) return;

      if (
        !respuesta?.success ||
        !validarMensaje(respuesta.data, conversationId) ||
        respuesta.data.clientMessageId !==
          datos.clientMessageId ||
        respuesta.data.contenido !== datos.contenido
      ) {
        throw new Error(
          "Respuesta de envío de mensaje no válida.",
        );
      }

      setMensajes((actuales) =>
        unirMensajes(actuales, [respuesta.data]),
      );

      envioPendienteRef.current = null;
      setContenido("");
      setErrorEnvio("");
    } catch (err) {
      if (versionRef.current !== version) return;

      setErrorEnvio(
        err.message || "No fue posible enviar el mensaje.",
      );
    } finally {
      if (versionRef.current === version) {
        solicitudEnvioRef.current = false;
        setEnviando(false);
      }
    }
  }

  useInternalMessagePolling({
    conversationId,
    activo:
      estado === "disponible" &&
      conversacion?.id === conversationId,
    initialMessageId: ultimoIdInicial,
    onMessages: (nuevos) => {
      if (
        estado !== "disponible" ||
        conversacion?.id !== conversationId
      ) {
        return;
      }

      const mensajesValidos = nuevos.filter((mensaje) =>
        validarMensaje(mensaje, conversationId),
      );

      if (mensajesValidos.length === 0) return;

      setMensajes((actuales) =>
        unirMensajes(actuales, mensajesValidos),
      );

      solicitarLectura(
        conversationId,
        obtenerUltimoId(mensajesValidos),
        versionRef.current,
      );
    },
  });

  const participantes = conversacion?.participants || [];

  const participantesPorId = new Map(
    participantes.map((participante) => [
      participante.id,
      participante,
    ]),
  );

  return (
    <section className="chat-internal-detail">
      <header className="chat-internal-detail__header">
        <Link to="/chat/interno">Volver a la bandeja</Link>
        <h1>Conversación interna</h1>
      </header>

      {estado === "cargando" && (
        <p role="status">
          Cargando conversación interna...
        </p>
      )}

      {estado === "error" && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() =>
              setIntento((actual) => actual + 1)
            }
          >
            Reintentar
          </button>
        </div>
      )}

      {estado === "disponible" && conversacion && (
        <>
          <section className="chat-internal-detail__card">
            <h2>{nombreConversacion(conversacion)}</h2>

            <p>
              {conversacion.tipo === "INTERNO_PRIVADO"
                ? "Conversación privada"
                : "Conversación grupal"}
            </p>

            <p>
              <strong>Estado:</strong> {conversacion.estado}
            </p>

            <h3>Participantes</h3>

            <ul>
              {participantes.map((participante) => (
                <li key={participante.id}>
                  {nombreEmpleado(participante)}
                </li>
              ))}
            </ul>
          </section>

          <section
            className="chat-internal-detail__card"
            aria-label="Historial interno"
          >
            <h2>Historial de mensajes</h2>

            {cursor !== null && (
              <button
                type="button"
                onClick={cargarAnteriores}
                disabled={cargandoAnteriores}
              >
                {cargandoAnteriores
                  ? "Cargando anteriores..."
                  : "Cargar mensajes anteriores"}
              </button>
            )}

            {errorAnteriores && (
              <p role="alert">{errorAnteriores}</p>
            )}

            {mensajes.length === 0 ? (
              <p>
                Todavía no hay mensajes en esta conversación.
              </p>
            ) : (
              <ol className="chat-internal-detail__messages">
                {mensajes.map((mensaje) => {
                  const participante =
                    participantesPorId.get(
                      mensaje.participantId,
                    );

                  return (
                    <li
                      key={mensaje.id}
                      className="chat-internal-detail__message"
                    >
                      <strong>
                        {participante
                          ? nombreEmpleado(participante)
                          : `Participante #${mensaje.participantId}`}
                      </strong>

                      <p>
                        {mensaje.deletedAt
                          ? "Mensaje eliminado"
                          : mensaje.contenido}
                      </p>

                      <time dateTime={mensaje.createdAt}>
                        {formatearFecha(
                          mensaje.createdAt,
                        )}
                      </time>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="chat-internal-detail__card">
            <h2>Enviar mensaje</h2>

            <form
              className="chat-internal-detail__form"
              onSubmit={enviarMensaje}
            >
              <label htmlFor="chat-internal-content">
                Mensaje
              </label>

              <textarea
                id="chat-internal-content"
                value={contenido}
                onChange={cambiarContenido}
                maxLength={MAX_CONTENIDO}
                rows={4}
                disabled={enviando}
                placeholder="Escribe tu mensaje..."
              />

              <p className="chat-internal-detail__counter">
                {contenido.length} / {MAX_CONTENIDO}
              </p>

              {errorEnvio && (
                <p role="alert">{errorEnvio}</p>
              )}

              <button
                type="submit"
                disabled={
                  enviando ||
                  !contenido.trim() ||
                  contenido.length > MAX_CONTENIDO
                }
              >
                {enviando
                  ? "Enviando..."
                  : "Enviar mensaje"}
              </button>
            </form>
          </section>
        </>
      )}
    </section>
  );
}

export default ChatInternalDetail;
