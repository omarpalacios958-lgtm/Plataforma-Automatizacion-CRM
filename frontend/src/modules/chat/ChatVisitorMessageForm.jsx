import { useEffect, useRef, useState } from "react";

import { enviarMensajeVisitante } from "../../services/chat-visitor.service.js";

const MAX_CARACTERES = 10000;

function ChatVisitorMessageForm({ conversationId, onMensajeEnviado }) {
  const [contenido, setContenido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const enviandoRef = useRef(false);
  const pendienteRef = useRef(null);
  const versionRef = useRef(0);

useEffect(() => {
  versionRef.current += 1;

  return () => {
    versionRef.current += 1;
  };
}, [conversationId]);

  async function enviar(event) {
    event.preventDefault();

    if (enviandoRef.current) return;

    const texto = contenido.trim();

    if (!texto || texto.length > MAX_CARACTERES) {
      setError("Escribe un mensaje de entre 1 y 10000 caracteres.");
      return;
    }

    let pendiente = pendienteRef.current;

    if (!pendiente || pendiente.contenido !== texto) {
      pendiente = {
        contenido: texto,
        clientMessageId: crypto.randomUUID(),
      };
      pendienteRef.current = pendiente;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setError("");

    const version = versionRef.current;

    try {
      const respuesta = await enviarMensajeVisitante(
        conversationId,
        pendiente,
      );

      if (version !== versionRef.current) return;

      if (
        !respuesta?.data ||
        !Number.isSafeInteger(respuesta.data.id)
      ) {
        throw new Error("Respuesta de envío inválida.");
      }

      pendienteRef.current = null;
      setContenido("");
      onMensajeEnviado(respuesta.data);
    } catch (err) {
      if (version !== versionRef.current) return;

      setError(
        err?.message ||
          "No fue posible enviar el mensaje. Intenta nuevamente.",
      );
    } finally {
      if (version === versionRef.current) {
        enviandoRef.current = false;
        setEnviando(false);
      }
    }
  }

  return (
    <form className="chat-visitor__message-form" onSubmit={enviar}>
      <label htmlFor="visitor-message-content">
        Escribe tu mensaje
      </label>

      <textarea
        id="visitor-message-content"
        value={contenido}
        maxLength={MAX_CARACTERES}
        rows={3}
        disabled={enviando}
        placeholder="Escribe aquí tu mensaje..."
        onChange={(event) => {
          setContenido(event.target.value);
          setError("");
        }}
      />

      {error && <p role="alert">{error}</p>}

      <button
        className="chat-visitor__button"
        type="submit"
        disabled={enviando || !contenido.trim()}
      >
        {enviando ? "Enviando..." : "Enviar mensaje"}
      </button>
    </form>
  );
}

export default ChatVisitorMessageForm;