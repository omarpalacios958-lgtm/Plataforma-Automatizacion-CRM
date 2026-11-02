
import { useEffect, useRef, useState } from "react";

import { asignarConversacionComercial } from "../../services/chat-commercial.service.js";

function ChatCommercialAssignment({
  conversacion,
  onAsignada,
  onConflicto,
}) {
  const [asignando, setAsignando] = useState(false);
  const [error, setError] = useState("");

  const solicitudRef = useRef(false);
  const vigenteRef = useRef(true);

  useEffect(() => {
    vigenteRef.current = true;

    return () => {
      vigenteRef.current = false;
    };
  }, []);

  if (
    !conversacion ||
    conversacion.estado !== "PENDIENTE" ||
    conversacion.assignedAgentId != null
  ) {
    return null;
  }

  async function asignar() {
    if (solicitudRef.current) return;

    solicitudRef.current = true;
    setAsignando(true);
    setError("");

    try {
      const resultado = await asignarConversacionComercial(
        conversacion.id,
      );

      if (!vigenteRef.current) return;

      if (
        !resultado ||
        resultado.id !== conversacion.id ||
        resultado.tipo !== "COMERCIAL" ||
        resultado.estado !== "ASIGNADA" ||
        !Number.isSafeInteger(resultado.assignedAgentId) ||
        resultado.assignedAgentId <= 0
      ) {
        throw new Error(
          "La respuesta de asignación no es válida.",
        );
      }

      onAsignada(resultado);
    } catch (err) {
      if (!vigenteRef.current) return;

      if (err?.status === 409) {
        setError(
          "La conversación ya fue asignada o cambió de estado.",
        );

        try {
          await onConflicto(conversacion.id);
        } catch {
          if (vigenteRef.current) {
            setError(
              "La conversación cambió. No fue posible actualizarla; vuelve a la bandeja e inténtalo nuevamente.",
            );
          }
        }
      } else {
        setError(
          err?.message ||
            "No fue posible asignar la conversación.",
        );
      }
    } finally {
      solicitudRef.current = false;

      if (vigenteRef.current) {
        setAsignando(false);
      }
    }
  }

  return (
    <div className="chat-commercial-detail__assignment">
      <button
        type="button"
        className="chat-commercial-detail__button"
        onClick={asignar}
        disabled={asignando}
      >
        {asignando
          ? "Asignando conversación..."
          : "Asignarme conversación"}
      </button>

      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default ChatCommercialAssignment;
