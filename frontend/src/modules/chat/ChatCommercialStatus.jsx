
import { useEffect, useRef, useState } from "react";
import {
  cambiarEstadoConversacionComercial,
} from "../../services/chat-commercial.service.js";

const TRANSICIONES = {
  ASIGNADA: {
    destino: "EN_CURSO",
    etiqueta: "Iniciar atención",
  },
  EN_CURSO: {
    destino: "RESUELTA",
    etiqueta: "Resolver conversación",
  },
};

function ChatCommercialStatus({
  conversacion,
  onEstadoActualizado,
  onConflicto,
}) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const solicitudRef = useRef(false);
  const vigenteRef = useRef(true);

  useEffect(() => {
    vigenteRef.current = true;

    return () => {
      vigenteRef.current = false;
    };
  }, []);

  const transicion = TRANSICIONES[conversacion?.estado];

  if (!conversacion || !transicion) {
    return null;
  }

  async function cambiarEstado() {
    if (solicitudRef.current) return;

    solicitudRef.current = true;
    setProcesando(true);
    setError("");

    try {
      const resultado =
        await cambiarEstadoConversacionComercial(
          conversacion.id,
          transicion.destino,
        );

      if (!vigenteRef.current) return;

      if (
        !resultado ||
        resultado.id !== conversacion.id ||
        resultado.tipo !== "COMERCIAL" ||
        resultado.estado !== transicion.destino ||
        resultado.assignedAgentId !==
          conversacion.assignedAgentId
      ) {
        throw new Error(
          "La respuesta del cambio de estado no es válida.",
        );
      }

      onEstadoActualizado(resultado);
    } catch (err) {
      if (!vigenteRef.current) return;

      if (err?.status === 409) {
        setError(
          "La conversación cambió de estado. Actualizando información...",
        );

        try {
          await onConflicto(conversacion.id);

          if (vigenteRef.current) {
            setError(
              "El estado de la conversación cambió. Revisa la información actualizada.",
            );
          }
        } catch {
          if (vigenteRef.current) {
            setError(
              "No fue posible actualizar el estado. Regresa a la bandeja e inténtalo nuevamente.",
            );
          }
        }
      } else {
        setError(
          err?.message ||
            "No fue posible cambiar el estado de la conversación.",
        );
      }
    } finally {
      solicitudRef.current = false;

      if (vigenteRef.current) {
        setProcesando(false);
      }
    }
  }

  return (
    <div className="chat-commercial-detail__status">
      <button
        type="button"
        className="chat-commercial-detail__button"
        onClick={cambiarEstado}
        disabled={procesando}
      >
        {procesando
          ? "Actualizando estado..."
          : transicion.etiqueta}
      </button>

      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default ChatCommercialStatus;
