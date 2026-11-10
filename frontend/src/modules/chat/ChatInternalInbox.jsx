
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listarEmpleadosDisponibles,
  listarConversacionesInternas,
  crearConversacionPrivada,
} from "../../services/chat-internal.service.js";
import "./ChatInternalInbox.css";

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
    const nombres = (conversacion.participants || [])
      .map(nombreEmpleado);

    return nombres.length > 0
      ? nombres.join(" / ")
      : `Conversación #${conversacion.id}`;
  }

  return `Grupo #${conversacion.id}`;
}

function ChatInternalInbox() {
  const navigate = useNavigate();

  const [conversaciones, setConversaciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [destinatarioId, setDestinatarioId] = useState("");

  const [cargando, setCargando] = useState(true);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(true);
  const [creando, setCreando] = useState(false);

  const [error, setError] = useState("");
  const [errorEmpleados, setErrorEmpleados] = useState("");
  const [errorCreacion, setErrorCreacion] = useState("");

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      setCargando(true);
      setError("");

      try {
        const resultado = await listarConversacionesInternas();

        if (!vigente) return;

        if (
          !resultado ||
          !Array.isArray(resultado.conversations)
        ) {
          throw new Error(
            "Respuesta de conversaciones internas no válida.",
          );
        }

        setConversaciones(resultado.conversations);
      } catch (err) {
        if (!vigente) return;

        setConversaciones([]);
        setError(
          err.message ||
            "No fue posible cargar las conversaciones internas.",
        );
      } finally {
        if (vigente) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      vigente = false;
    };
  }, [version]);

  useEffect(() => {
    let vigente = true;

    async function cargarEmpleados() {
      setCargandoEmpleados(true);
      setErrorEmpleados("");

      try {
        const resultado = await listarEmpleadosDisponibles();

        if (!vigente) return;

        if (
          !resultado ||
          !Array.isArray(resultado.employees)
        ) {
          throw new Error(
            "Respuesta de empleados no válida.",
          );
        }

        setEmpleados(resultado.employees);
      } catch (err) {
        if (!vigente) return;

        setEmpleados([]);
        setErrorEmpleados(
          err.message ||
            "No fue posible cargar los empleados.",
        );
      } finally {
        if (vigente) {
          setCargandoEmpleados(false);
        }
      }
    }

    cargarEmpleados();

    return () => {
      vigente = false;
    };
  }, []);

  async function iniciarConversacion(event) {
    event.preventDefault();

    if (creando) return;

    setErrorCreacion("");

    const id = Number(destinatarioId);

    if (
      !destinatarioId ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !empleados.some((empleado) => empleado.id === id)
    ) {
      setErrorCreacion(
        "Selecciona un empleado válido.",
      );
      return;
    }

    setCreando(true);

    try {
      const conversacion = await crearConversacionPrivada(id);

      navigate(`/chat/interno/${conversacion.id}`);
    } catch (err) {
      setErrorCreacion(
        err.message ||
          "No fue posible iniciar la conversación.",
      );
    } finally {
      setCreando(false);
    }
  }

  return (
    <section className="chat-internal">
      <header className="chat-internal__header">
        <div>
          <h1>Chat interno</h1>
          <p>
            Consulta las conversaciones privadas y grupales
            entre empleados.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVersion((actual) => actual + 1)}
          disabled={cargando}
        >
          Actualizar
        </button>
      </header>

      <div className="chat-internal__new-conversation">
        <h2>Nueva conversación privada</h2>
        <p>
          Selecciona un empleado para iniciar o continuar
          una conversación.
        </p>

        <form onSubmit={iniciarConversacion}>
          <label htmlFor="chat-internal-recipient">
            Empleado destinatario
          </label>

          <select
            id="chat-internal-recipient"
            value={destinatarioId}
            onChange={(event) => {
              setDestinatarioId(event.target.value);
              setErrorCreacion("");
            }}
            disabled={cargandoEmpleados || creando}
            required
          >
            <option value="">
              {cargandoEmpleados
                ? "Cargando empleados..."
                : "Selecciona un empleado"}
            </option>

            {empleados.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>
                {[
                  empleado.nombre,
                  empleado.apellido,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || `Empleado #${empleado.id}`}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={
              creando ||
              cargandoEmpleados ||
              empleados.length === 0 ||
              !destinatarioId
            }
          >
            {creando
              ? "Iniciando conversación..."
              : "Iniciar conversación"}
          </button>
        </form>

        {errorEmpleados && (
          <p className="chat-internal__error" role="alert">
            {errorEmpleados}
          </p>
        )}

        {errorCreacion && (
          <p className="chat-internal__error" role="alert">
            {errorCreacion}
          </p>
        )}

        {!cargandoEmpleados &&
          !errorEmpleados &&
          empleados.length === 0 && (
            <p>
              No hay otros empleados activos disponibles.
            </p>
          )}
      </div>

      {error && (
        <p className="chat-internal__error" role="alert">
          {error}
        </p>
      )}

      {cargando ? (
        <p role="status">
          Cargando conversaciones internas...
        </p>
      ) : error ? null : conversaciones.length === 0 ? (
        <p>No tienes conversaciones internas disponibles.</p>
      ) : (
        <div className="chat-internal__table-wrapper">
          <table className="chat-internal__table">
            <thead>
              <tr>
                <th scope="col">Conversación</th>
                <th scope="col">Tipo</th>
                <th scope="col">Participantes</th>
                <th scope="col">No leídos</th>
                <th scope="col">Estado</th>
                <th scope="col">Actualización</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {conversaciones.map((conversacion) => {
                const noLeidos =
                  Number.isSafeInteger(conversacion.unreadCount) &&
                  conversacion.unreadCount >= 0
                    ? conversacion.unreadCount
                    : 0;

                return (
                  <tr key={conversacion.id}>
                    <td>{nombreConversacion(conversacion)}</td>

                    <td>
                      {conversacion.tipo === "INTERNO_PRIVADO"
                        ? "Privada"
                        : "Grupal"}
                    </td>

                    <td>
                      {(conversacion.participants || [])
                        .map(nombreEmpleado)
                        .join(", ") || "Sin participantes"}
                    </td>

                    <td>
                      <span
                        className={
                          noLeidos > 0
                            ? "chat-internal__unread chat-internal__unread--pending"
                            : "chat-internal__unread"
                        }
                        aria-label={`${noLeidos} mensajes no leídos`}
                      >
                        {noLeidos}
                      </span>
                    </td>

                    <td>{conversacion.estado}</td>

                    <td>
                      {conversacion.updatedAt
                        ? new Date(
                            conversacion.updatedAt,
                          ).toLocaleString()
                        : "Sin fecha"}
                    </td>

                    <td>
                      <Link
                        to={`/chat/interno/${conversacion.id}`}
                      >
                        Ver mensajes
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ChatInternalInbox;
