import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import ChatCommercialStatus from "./ChatCommercialStatus.jsx";

import { obtenerConversacionComercial } from "../../services/chat-commercial.service.js";
import ChatCommercialAssignment from "./ChatCommercialAssignment.jsx";
import ChatCommercialMessages from "./ChatCommercialMessages.jsx";

import "./ChatCommercialDetail.css";

function formatearFecha(valor) {
  if (!valor) return "—";

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime())
    ? "—"
    : fecha.toLocaleString();
}

function ChatCommercialDetail() {
  const { conversationId } = useParams();
  const { usuario } = useAuth();

const conversationIdRef = useRef(conversationId);

useEffect(() => {
  conversationIdRef.current = conversationId;
}, [conversationId]);

  const [conversacion, setConversacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setCargando(true);
      setError("");
      setConversacion(null);

      if (!/^[1-9]\d*$/.test(conversationId)) {
        setError("Identificador de conversación inválido.");
        setCargando(false);
        return;
      }

      try {
        const resultado = await obtenerConversacionComercial(
          conversationId,
        );

        if (!vigente) return;

        if (
          !resultado ||
          String(resultado.id) !== conversationId ||
          resultado.tipo !== "COMERCIAL" ||
          !Array.isArray(resultado.participants)
        ) {
          throw new Error(
            "La respuesta del detalle comercial no es válida.",
          );
        }

        setConversacion(resultado);
      } catch (err) {
        if (!vigente) return;

        setError(
          err.message ||
            "No fue posible consultar la conversación.",
        );
      } finally {
        if (vigente) setCargando(false);
      }
    }

    cargar();

    return () => {
      vigente = false;
    };
  }, [conversationId]);

  const esAgenteAsignado =
    usuario?.id != null &&
    conversacion?.assignedAgentId != null &&
    Number.isSafeInteger(Number(usuario.id)) &&
    Number(usuario.id) > 0 &&
    Number(usuario.id) === Number(conversacion.assignedAgentId);

  return (
    <section className="chat-commercial-detail">
      <header className="chat-commercial-detail__header">
        <div>
          <Link to="/chat/comercial">
            Volver a la bandeja
          </Link>

          <h1>Detalle de conversación comercial</h1>
        </div>
      </header>

      {cargando && (
        <p role="status">Cargando conversación...</p>
      )}

      {!cargando && error && (
        <p
          className="chat-commercial-detail__error"
          role="alert"
        >
          {error}
        </p>
      )}

      {!cargando && !error && conversacion && (
        <>
          <section className="chat-commercial-detail__card">
            <h2>
              {conversacion.nombre ||
                `Conversación #${conversacion.id}`}
            </h2>

            <dl className="chat-commercial-detail__data">
              <div>
                <dt>Identificador</dt>
                <dd>{conversacion.id}</dd>
              </div>

              <div>
                <dt>Estado</dt>
                <dd>{conversacion.estado}</dd>
              </div>

              <div>
                <dt>Agente asignado</dt>
                <dd>
                  {conversacion.assignedAgentId == null
                    ? "Sin asignar"
                    : `Agente #${conversacion.assignedAgentId}`}
                </dd>
              </div>

              <div>
                <dt>Creación</dt>
                <dd>
                  {formatearFecha(conversacion.createdAt)}
                </dd>
              </div>

              <div>
                <dt>Última actualización</dt>
                <dd>
                  {formatearFecha(conversacion.updatedAt)}
                </dd>
              </div>
            </dl>
          </section>

          <ChatCommercialAssignment
            key={conversacion.id}
            conversacion={conversacion}
            onAsignada={(resultado) => {
              if (
                conversationIdRef.current !== String(resultado.id)
              ) {
                return;
              }

              setConversacion((actual) => {
                if (!actual || actual.id !== resultado.id) {
                  return actual;
                }

                return {
                  ...actual,
                  ...resultado,
                };
              });
            }}
            onConflicto={async (id) => {
              const actualizada =
                await obtenerConversacionComercial(id);

              if (
                !actualizada ||
                actualizada.id !== id ||
                actualizada.tipo !== "COMERCIAL" ||
                !Array.isArray(actualizada.participants)
              ) {
                throw new Error(
                  "No fue posible actualizar la conversación.",
                );
              }

              if (conversationIdRef.current !== String(id)) {
                return;
              }

              setConversacion((actual) =>
                actual?.id === id ? actualizada : actual,
              );
            }}
          />

          {esAgenteAsignado && (
            <ChatCommercialStatus
              key={`estado-${conversacion.id}`}
              conversacion={conversacion}
              onEstadoActualizado={(resultado) => {
                if (
                  conversationIdRef.current !==
                  String(resultado.id)
                ) {
                  return;
                }

                setConversacion((actual) => {
                  if (!actual || actual.id !== resultado.id) {
                    return actual;
                  }

                  return {
                    ...actual,
                    ...resultado,
                  };
                });
              }}
              onConflicto={async (id) => {
                const actualizada =
                  await obtenerConversacionComercial(id);

                if (
                  !actualizada ||
                  actualizada.id !== id ||
                  actualizada.tipo !== "COMERCIAL" ||
                  !Array.isArray(actualizada.participants)
                ) {
                  throw new Error(
                    "No fue posible actualizar la conversación.",
                  );
                }

                if (
                  conversationIdRef.current !== String(id)
                ) {
                  return;
                }

                setConversacion((actual) =>
                  actual?.id === id ? actualizada : actual,
                );
              }}
            />
          )}

          <section className="chat-commercial-detail__card">
            <h2>Visitantes activos</h2>

            {conversacion.participants.length === 0 ? (
              <p>
                No hay visitantes activos registrados.
              </p>
            ) : (
              <ul className="chat-commercial-detail__visitors">
                {conversacion.participants.map(
                  (participante) => (
                    <li key={participante.id}>
                      <strong>
                        {participante.visitor?.nombre ||
                          `Visitante #${participante.visitor?.id ?? participante.id}`}
                      </strong>

                      <span>
                        {participante.visitor?.correo ||
                          "Sin correo registrado"}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>

          <ChatCommercialMessages
            key={`${conversacion.id}-${conversacion.assignedAgentId ?? "sin-agente"}`}
            conversationId={conversacion.id}
          />
        </>
      )}
    </section>
  );
}

export default ChatCommercialDetail;