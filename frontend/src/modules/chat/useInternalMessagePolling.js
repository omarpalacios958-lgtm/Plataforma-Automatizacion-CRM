
import { useEffect, useRef } from "react";

import {
  obtenerMensajesInternos,
} from "../../services/chat-internal.service.js";

const INTERVALO_POLLING = 5000;
const LIMITE_POLLING = 20;

function validarMensajeIncremental(mensaje, conversationId) {
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

function validarPaginaIncremental(
  pagina,
  conversationId,
  afterId,
) {
  if (
    !pagina ||
    !Array.isArray(pagina.messages) ||
    pagina.messages.length > LIMITE_POLLING ||
    pagina.messages.some(
      (mensaje) =>
        !validarMensajeIncremental(
          mensaje,
          conversationId,
        ),
    ) ||
    (pagina.nextCursor !== null &&
      (!Number.isSafeInteger(pagina.nextCursor) ||
        pagina.nextCursor <= 0))
  ) {
    throw new Error(
      "Respuesta incremental de mensajes no válida.",
    );
  }

  let anterior = afterId;

  for (const mensaje of pagina.messages) {
    if (mensaje.id <= anterior) {
      throw new Error(
        "La sincronización de mensajes no avanzó correctamente.",
      );
    }

    anterior = mensaje.id;
  }

  if (
    pagina.nextCursor !== null &&
    (
      pagina.messages.length === 0 ||
      pagina.nextCursor !== anterior
    )
  ) {
    throw new Error(
      "Cursor incremental de mensajes no válido.",
    );
  }

  return pagina;
}

function useInternalMessagePolling({
  conversationId,
  activo,
  initialMessageId,
  onMessages,
}) {
  const onMessagesRef = useRef(onMessages);

  useEffect(() => {
    onMessagesRef.current = onMessages;
  }, [onMessages]);

  useEffect(() => {
    if (
      !activo ||
      !Number.isSafeInteger(conversationId) ||
      conversationId <= 0 ||
      !Number.isSafeInteger(initialMessageId) ||
      initialMessageId < 0
    ) {
      return undefined;
    }

    let vigente = true;
    let solicitudActiva = false;
    let marcador = initialMessageId;

    async function sincronizar() {
      if (!vigente || solicitudActiva) {
        return;
      }

      solicitudActiva = true;

      try {
        let afterId = marcador;
        let hayMas = true;

        while (vigente && hayMas) {
          const pagina = validarPaginaIncremental(
            await obtenerMensajesInternos(
              conversationId,
              {
                limit: LIMITE_POLLING,
                afterId,
              },
            ),
            conversationId,
            afterId,
          );

          if (!vigente) return;

          if (pagina.messages.length > 0) {
            const ultimoId =
              pagina.messages[
                pagina.messages.length - 1
              ].id;

            onMessagesRef.current(pagina.messages);

            marcador = ultimoId;
            afterId = ultimoId;
          }

          hayMas = pagina.nextCursor !== null;
        }
      } catch {
        // Conservar el historial y reintentar en el siguiente ciclo.
      } finally {
        solicitudActiva = false;
      }
    }

    const intervalo = setInterval(() => {
      void sincronizar();
    }, INTERVALO_POLLING);

    return () => {
      vigente = false;
      clearInterval(intervalo);
    };
  }, [activo, conversationId, initialMessageId]);
}

export default useInternalMessagePolling;
