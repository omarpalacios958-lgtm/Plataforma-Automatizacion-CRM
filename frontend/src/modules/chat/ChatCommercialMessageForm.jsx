
import { useEffect, useRef, useState } from "react";

import {
  enviarMensajeComercial,
} from "../../services/chat-commercial.service.js";

const LIMITE_CONTENIDO = 10000;

function generarClientMessageId() {
  return `commercial_${crypto.randomUUID().replaceAll("-", "")}`;
}

function ChatCommercialMessageForm({
  conversationId,
  onMensajeEnviado,
}) {
  const [contenido, setContenido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const solicitudRef = useRef(false);
  const pendienteRef = useRef(null);
  const versionRef = useRef(0);
  const vigenteRef = useRef(false);

  useEffect(() => {
    vigenteRef.current = true;

    return () => {
      vigenteRef.current = false;
      versionRef.current += 1;
    };
  }, []);


  function cambiarContenido(valor) {
    setContenido(valor);
    setError("");

    if (
      pendienteRef.current !== null &&
      pendienteRef.current.contenido !== valor.trim()
    ) {
      pendienteRef.current = null;
    }
  }


  async function enviar(evento) {
    evento.preventDefault();

    if (solicitudRef.current) return;

    const contenidoNormalizado = contenido.trim();

    if (
      !contenidoNormalizado ||
      contenido.length > LIMITE_CONTENIDO
    ) {
      setError(
        "El mensaje debe contener entre 1 y 10000 caracteres.",
      );
      return;
    }

    const pendiente =
      pendienteRef.current?.conversationId === conversationId &&
      pendienteRef.current?.contenido === contenidoNormalizado
        ? pendienteRef.current
        : {
            conversationId,
            contenido: contenidoNormalizado,
            clientMessageId: generarClientMessageId(),
          };

    pendienteRef.current = pendiente;
    solicitudRef.current = true;

    const version = versionRef.current;

    setEnviando(true);
    setError("");

    try {
      const respuesta = await enviarMensajeComercial(
        conversationId,
        {
          contenido: pendiente.contenido,
          clientMessageId: pendiente.clientMessageId,
        },
      );

      if (
        !vigenteRef.current ||
        version !== versionRef.current
      ) {
        return;
      }

      const mensaje = respuesta?.data;

      if (
        respuesta?.success !== true ||
        !mensaje ||
        !Number.isSafeInteger(mensaje.id) ||
        mensaje.id <= 0 ||
        Number(mensaje.conversationId) !==
          Number(conversationId) ||
        mensaje.clientMessageId !== pendiente.clientMessageId ||
        mensaje.contenido !== pendiente.contenido
      ) {
        throw new Error(
          "La respuesta del envío comercial no es válida.",
        );
      }

      pendienteRef.current = null;
      setContenido("");

      onMensajeEnviado?.(mensaje);
    } catch (err) {
      if (
        !vigenteRef.current ||
        version !== versionRef.current
      ) {
        return;
      }

      setError(
        err?.message ||
          "No fue posible enviar el mensaje. Puedes reintentar.",
      );
    } finally {
      if (version === versionRef.current) {
        solicitudRef.current = false;

        if (vigenteRef.current) {
          setEnviando(false);
        }
      }
    }
  }

  return (
    <form
      className="chat-commercial-detail__card"
      aria-label="Responder conversación comercial"
      onSubmit={enviar}
    >
      <h2>Responder al visitante</h2>

      <label htmlFor="commercial-message-content">
        Mensaje
      </label>

      <textarea
        id="commercial-message-content"
        value={contenido}
        onChange={(evento) =>
          cambiarContenido(evento.target.value)
        }
        maxLength={LIMITE_CONTENIDO}
        rows={4}
        disabled={enviando}
        placeholder="Escribe tu respuesta..."
      />

      <button
        type="submit"
        className="chat-commercial-detail__button"
        disabled={enviando || !contenido.trim()}
      >
        {enviando ? "Enviando..." : "Enviar respuesta"}
      </button>

      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export default ChatCommercialMessageForm;
