
import { useEffect, useRef, useState } from "react";

import {
  consultarSesionVisitante,
  crearSesionVisitante,
  eliminarTokenVisitante,
  obtenerTokenVisitante,
} from "../../services/chat-visitor.service.js";

import "./ChatVisitor.css";

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Se replica la validación del backend para rechazar caracteres de control.
// eslint-disable-next-line no-control-regex
const CONTROL_REGEX = /[\x00-\x1F\x7F]/;

function validarFormulario(nombre, correo) {
  const nombreNormalizado = nombre.trim();
  const correoNormalizado = correo.trim().toLowerCase();

  if (
    nombreNormalizado.length < 2 ||
    nombreNormalizado.length > 120 ||
    CONTROL_REGEX.test(nombreNormalizado)
  ) {
    return {
      error: "El nombre debe tener entre 2 y 120 caracteres válidos.",
    };
  }

  if (
    correoNormalizado &&
    (correoNormalizado.length > 254 ||
      !CORREO_REGEX.test(correoNormalizado))
  ) {
    return {
      error: "Ingresa un correo electrónico válido.",
    };
  }

  return {
    datos: {
      nombre: nombreNormalizado,
      correo: correoNormalizado || null,
    },
  };
}

function ChatVisitor() {
  const [estado, setEstado] = useState("verificando");
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");

  const montado = useRef(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    montado.current = true;

    return () => {
      montado.current = false;
    };
  }, []);

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

  async function iniciarSesion(event) {
    event.preventDefault();

    if (enviandoRef.current) return;

    const resultado = validarFormulario(nombre, correo);

    if (resultado.error) {
      setErrorFormulario(resultado.error);
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErrorFormulario("");

    try {
      const data = await crearSesionVisitante(resultado.datos);

      if (!montado.current) return;

      setSesion({
        visitor: data.visitor,
        expiresAt: data.expiresAt,
      });
      setEstado("autenticado");
    } catch (err) {
      if (!montado.current) return;

      setErrorFormulario(
        err.message || "No fue posible iniciar la sesión.",
      );
    } finally {
      enviandoRef.current = false;

      if (montado.current) {
        setEnviando(false);
      }
    }
  }

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
              Ingresa tus datos para continuar como visitante.
            </p>

            <form
              className="chat-visitor__form"
              onSubmit={iniciarSesion}
              noValidate
            >
              <div className="chat-visitor__field">
                <label htmlFor="visitor-nombre">
                  Nombre *
                </label>

                <input
                  id="visitor-nombre"
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  value={nombre}
                  disabled={enviando}
                  onChange={(event) => {
                    setNombre(event.target.value);
                    setErrorFormulario("");
                  }}
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div className="chat-visitor__field">
                <label htmlFor="visitor-correo">
                  Correo electrónico (opcional)
                </label>

                <input
                  id="visitor-correo"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={correo}
                  disabled={enviando}
                  onChange={(event) => {
                    setCorreo(event.target.value);
                    setErrorFormulario("");
                  }}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              {errorFormulario && (
                <p
                  className="chat-visitor__form-error"
                  role="alert"
                >
                  {errorFormulario}
                </p>
              )}

              <button
                className="chat-visitor__button"
                type="submit"
                disabled={enviando}
              >
                {enviando
                  ? "Creando sesión..."
                  : "Continuar como visitante"}
              </button>
            </form>

            <p className="chat-visitor__hint">
              El correo electrónico es opcional.
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
