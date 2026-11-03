
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/api.js", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "../src/services/api.js";
import { enviarMensajeInterno } from "../src/services/chat-internal.service.js";

describe("CH-05.5.1 - Envío de mensajes internos", () => {
  const conversationId = 2;

  const datosValidos = {
    contenido: "Hola, equipo.",
    clientMessageId: "mensaje_interno_001",
  };

  const mensaje = {
    id: 125,
    conversationId: 2,
    participantId: 7,
    contenido: "Hola, equipo.",
    clientMessageId: "mensaje_interno_001",
    createdAt: "2026-11-03T12:00:00.000Z",
    editedAt: null,
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envía un mensaje mediante POST con el cuerpo esperado", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      message: "Mensaje enviado.",
      data: mensaje,
    });

    const resultado = await enviarMensajeInterno(
      conversationId,
      datosValidos,
    );

    expect(apiRequest).toHaveBeenCalledWith(
      "/chat/conversations/2/messages",
      {
        method: "POST",
        body: JSON.stringify(datosValidos),
      },
    );

    expect(resultado.data).toEqual(mensaje);
  });

  it("elimina espacios exteriores antes de enviar", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      data: mensaje,
    });

    await enviarMensajeInterno(conversationId, {
      ...datosValidos,
      contenido: "  Hola, equipo.  ",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/chat/conversations/2/messages",
      {
        method: "POST",
        body: JSON.stringify(datosValidos),
      },
    );
  });

  it.each([0, -1, 1.5, "2", null, Number.MAX_SAFE_INTEGER + 1])(
    "rechaza un identificador de conversación inválido: %s",
    async (id) => {
      await expect(
        enviarMensajeInterno(id, datosValidos),
      ).rejects.toThrow("entero positivo");

      expect(apiRequest).not.toHaveBeenCalled();
    },
  );

  it.each([null, undefined, [], "texto", 5])(
    "rechaza datos de mensaje inválidos: %s",
    async (datos) => {
      await expect(
        enviarMensajeInterno(conversationId, datos),
      ).rejects.toThrow("Los datos del mensaje no son válidos.");

      expect(apiRequest).not.toHaveBeenCalled();
    },
  );

  it.each([
    "",
    " ",
    "\n\t",
    null,
    undefined,
    123,
    "a".repeat(10001),
  ])("rechaza contenido inválido", async (contenido) => {
    await expect(
      enviarMensajeInterno(conversationId, {
        ...datosValidos,
        contenido,
      }),
    ).rejects.toThrow("El contenido debe tener");

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("acepta un mensaje de exactamente 10000 caracteres", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      data: mensaje,
    });

    await enviarMensajeInterno(conversationId, {
      ...datosValidos,
      contenido: "a".repeat(10000),
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it.each([
    "",
    "abc",
    "id con espacios",
    "id.con.puntos",
    "ábcdefgh",
    "a".repeat(129),
    null,
    undefined,
  ])("rechaza clientMessageId inválido", async (clientMessageId) => {
    await expect(
      enviarMensajeInterno(conversationId, {
        ...datosValidos,
        clientMessageId,
      }),
    ).rejects.toThrow("clientMessageId");

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("acepta clientMessageId de 8 y 128 caracteres", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      data: mensaje,
    });

    await enviarMensajeInterno(conversationId, {
      ...datosValidos,
      clientMessageId: "a".repeat(8),
    });

    await enviarMensajeInterno(conversationId, {
      ...datosValidos,
      clientMessageId: "a".repeat(128),
    });

    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it("conserva el mismo clientMessageId en un reintento", async () => {
    apiRequest
      .mockRejectedValueOnce(new Error("Error de conexión."))
      .mockResolvedValueOnce({
        success: true,
        message: "Mensaje existente.",
        data: mensaje,
      });

    await expect(
      enviarMensajeInterno(conversationId, datosValidos),
    ).rejects.toThrow("Error de conexión.");

    const resultado = await enviarMensajeInterno(
      conversationId,
      datosValidos,
    );

    expect(apiRequest).toHaveBeenCalledTimes(2);

    const primeraSolicitud = apiRequest.mock.calls[0][1];
    const segundaSolicitud = apiRequest.mock.calls[1][1];

    expect(segundaSolicitud.body).toBe(primeraSolicitud.body);
    expect(resultado.data).toEqual(mensaje);
  });

  it("propaga un error de autorización sin ocultarlo", async () => {
    const error = Object.assign(
      new Error("Conversacion no encontrada."),
      { status: 404 },
    );

    apiRequest.mockRejectedValue(error);

    await expect(
      enviarMensajeInterno(conversationId, datosValidos),
    ).rejects.toMatchObject({
      status: 404,
      message: "Conversacion no encontrada.",
    });
  });

  it("propaga un conflicto 409 por reutilización de clientMessageId", async () => {
    const error = Object.assign(
      new Error("clientMessageId ya fue utilizado para otro mensaje."),
      { status: 409 },
    );

    apiRequest.mockRejectedValue(error);

    await expect(
      enviarMensajeInterno(conversationId, datosValidos),
    ).rejects.toMatchObject({
      status: 409,
    });
  });
});
