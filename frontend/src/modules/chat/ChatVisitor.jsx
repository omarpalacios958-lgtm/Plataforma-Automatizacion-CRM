
import { useEffect, useState } from "react";

import {
  consultarSesionVisitante,
  eliminarTokenVisitante,
  obtenerTokenVisitante,
} from "../../services/chat-visitor.service.js";

import "./ChatVisitor.css";

function ChatVisitor() {
  const [estado, setEstado] = useState("verificando");
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    async function verificarSesion() {
      setEstado("verificando");
      setError("");

      if (!obtenerTokenVisitante()) {
        setSesion(null);
        setEstado("sin-sesion");
        return;
      }

      try {
        const data = await consultarSesionVisitante();

        if (!activo) return;

        setSesion(data);
        setEstado("autenticado");
      } catch (err) {
        if (!activo) return;

        if (err.status === 401) {
          eliminarTokenVisitante();
          setSesion(null);
          setEstado("sin-sesion");
          return;
        }

        setError(
          "No fue posible verificar tu sesión. Intenta nuevamente.",
        );
        setEstado("error");
      }
    }

    verificarSesion();

    return () => {
      activo = false;
    };
  }, [intento]);

  return (
    <main className="chat-visitor">
      <section className="chat-visitor__panel">
        <header className="chat-visitor__header">
          <span className="chat-visitor__eyebrow">
            Atención al cliente
          </span>

          <h1>Chat de atención</h1>

          <p>
            Comunícate con nuestro equipo desde esta plataforma.
          </p>
        </header>

        {estado === "verificando" && (
          <div className="chat-visitor__content" role="status">
            <p>Verificando tu sesión...</p>
          </div>
        )}

        {estado === "sin-sesion" && (
          <div className="chat-visitor__content">
            <h2>Bienvenido</h2>

            <p>
              Podrás iniciar una conversación como visitante.
            </p>

            <p className="chat-visitor__hint">
              El formulario de acceso se incorporará en el
              siguiente incremento.
            </p>
          </div>
        )}

        {estado === "autenticado" && (
          <div className="chat-visitor__content">
            <h2>
              Hola
              {sesion?.visitor?.nombre
                ? `, ${sesion.visitor.nombre}`
                : ""}
            </h2>

            <p>Tu sesión de visitante está activa.</p>

            <p className="chat-visitor__hint">
              La apertura de conversaciones se incorporará
              posteriormente.
            </p>
          </div>
        )}

        {estado === "error" && (
          <div className="chat-visitor__content" role="alert">
            <h2>No se pudo conectar</h2>

            <p>{error}</p>

            <button
              className="chat-visitor__button"
              type="button"
              onClick={() => setIntento((actual) => actual + 1)}
            >
              Reintentar
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default ChatVisitor;
