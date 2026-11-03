
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/api.js", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "../src/services/api.js";
import { obtenerMensajesInternos } from "../src/services/chat-internal.service.js";

describe("CH-05.4.1 - Consulta de mensajes internos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta el historial sin parámetros opcionales", async () => {
    const respuesta = {
      messages: [
        {
          id: 10,
          conversationId: 2,
          participantId: 3,
          contenido: "Hola",
        },
      ],
      nextCursor: null,
    };

    apiRequest.mockResolvedValue({ data: respuesta });

    const resultado = await obtenerMensajesInternos(2);

    expect(apiRequest).toHaveBeenCalledWith(
      "/chat/conversations/2/messages",
    );
    expect(resultado).toEqual(respuesta);
  });

  it("permite indicar un límite de mensajes", async () => {
    apiRequest.mockResolvedValue({
      data: { messages: [], nextCursor: null },
    });

    await obtenerMensajesInternos(2, { limit: 20 });

    expect(apiRequest).toHaveBeenCalledWith(
      "/chat/conversations/2/messages?limit=20",
    );
  });

  it("consulta mensajes anteriores mediante cursor", async () => {
    apiRequest.mockResolvedValue({
      data: { messages: [], nextCursor: null },
    });

    await obtenerMensajesInternos(2, {
      limit: 10,
      cursor: 35,
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/chat/conversations/2/messages?limit=10&cursor=35",
    );
  });

  it("consulta mensajes nuevos mediante afterId", async () => {
    apiRequest.mockResolvedValue({
      data: { messages: [], nextCursor: null },
    });

    await obtenerMensajesInternos(2, {
      limit: 25,
      afterId: 40,
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/chat/conversations/2/messages?limit=25&afterId=40",
    );
  });

  it("permite afterId igual a cero", async () => {
    apiRequest.mockResolvedValue({
      data: { messages: [], nextCursor: null },
    });

    await obtenerMensajesInternos(2, { afterId: 0 });

    expect(apiRequest).toHaveBeenCalledWith(
      "/chat/conversations/2/messages?afterId=0",
    );
  });

  it.each([0, -1, 1.5, "2", null, undefined])(
    "rechaza conversationId inválido: %s",
    async (conversationId) => {
      await expect(
        obtenerMensajesInternos(conversationId),
      ).rejects.toThrow();

      expect(apiRequest).not.toHaveBeenCalled();
    },
  );

  it.each([
    { limit: 0 },
    { limit: 51 },
    { limit: 1.5 },
    { cursor: 0 },
    { cursor: -2 },
    { afterId: -1 },
    { afterId: 1.5 },
    { cursor: 10, afterId: 11 },
    null,
    [],
  ])(
    "rechaza opciones de paginación inválidas: %j",
    async (opciones) => {
      await expect(
        obtenerMensajesInternos(2, opciones),
      ).rejects.toThrow();

      expect(apiRequest).not.toHaveBeenCalled();
    },
  );

  it("propaga los errores HTTP del servicio API", async () => {
    apiRequest.mockRejectedValue(
      new Error("Conversación no encontrada."),
    );

    await expect(
      obtenerMensajesInternos(99),
    ).rejects.toThrow("Conversación no encontrada.");
  });
});
