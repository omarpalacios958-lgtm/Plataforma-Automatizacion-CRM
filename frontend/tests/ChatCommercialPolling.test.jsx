
/* @vitest-environment jsdom */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import ChatCommercialMessages from "../src/modules/chat/ChatCommercialMessages.jsx";
import { listarMensajesComerciales } from "../src/services/chat-commercial.service.js";

vi.mock("../src/services/chat-commercial.service.js", () => ({
  listarMensajesComerciales: vi.fn(),
}));

function mensaje(id, contenido, conversationId = 3) {
  return {
    id,
    conversationId,
    participantId: 20,
    contenido,
    clientMessageId: `mensaje_${id}_prueba`,
    createdAt: "2026-10-30T12:00:00.000Z",
    editedAt: null,
    deletedAt: null,
  };
}

function pagina(messages = [], nextCursor = null) {
  return { messages, nextCursor };
}

function crearPromesaPendiente() {
  let resolver;

  const promesa = new Promise((resolve) => {
    resolver = resolve;
  });

  return { promesa, resolver };
}

async function completarPromesa(pendiente, resultado) {
  await act(async () => {
    pendiente.resolver(resultado);
    await pendiente.promesa;
  });
}

async function avanzarCincoSegundos() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
}

async function completarCargaInicial() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("ChatCommercialMessages - polling incremental", () => {
  it("recupera mensajes nuevos despues de cinco segundos", async () => {
    listarMensajesComerciales
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Mensaje inicial")]),
      )
      .mockResolvedValueOnce(
        pagina([mensaje(11, "Mensaje recibido")]),
      )
      .mockResolvedValue(pagina());

    render(<ChatCommercialMessages conversationId={3} />);

    await completarCargaInicial();

    expect(screen.getByText("Mensaje inicial")).toBeTruthy();
    expect(listarMensajesComerciales).toHaveBeenCalledTimes(1);

    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, afterId: 10 },
    );

    expect(screen.getByText("Mensaje recibido")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("no consulta incrementales mientras la carga inicial esta pendiente", async () => {
    const pendiente = crearPromesaPendiente();

    listarMensajesComerciales.mockReturnValueOnce(
      pendiente.promesa,
    );

    render(<ChatCommercialMessages conversationId={3} />);

    expect(
      screen.getByText("Cargando mensajes comerciales..."),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenCalledTimes(1);

    await completarPromesa(
      pendiente,
      pagina([mensaje(5, "Carga inicial completada")]),
    );

    expect(
      screen.getByText("Carga inicial completada"),
    ).toBeTruthy();

    listarMensajesComerciales.mockResolvedValue(pagina());

    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, afterId: 5 },
    );
  });

  it("recupera mas de veinte mensajes desde una conversacion vacia", async () => {
    const primeros = Array.from(
      { length: 20 },
      (_, indice) =>
        mensaje(indice + 1, `Mensaje ${indice + 1}`),
    );

    const siguientes = Array.from(
      { length: 20 },
      (_, indice) =>
        mensaje(indice + 21, `Mensaje ${indice + 21}`),
    );

    const ultimos = Array.from(
      { length: 5 },
      (_, indice) =>
        mensaje(indice + 41, `Mensaje ${indice + 41}`),
    );

    listarMensajesComerciales
      .mockResolvedValueOnce(pagina())
      .mockResolvedValueOnce(pagina(primeros, 20))
      .mockResolvedValueOnce(pagina(siguientes, 40))
      .mockResolvedValueOnce(pagina(ultimos));

    render(<ChatCommercialMessages conversationId={3} />);

    await completarCargaInicial();

    expect(
      screen.getByText(
        "Todavía no hay mensajes en esta conversación.",
      ),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenCalledTimes(4);

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, afterId: 0 },
    );

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      3,
      3,
      { limit: 20, afterId: 20 },
    );

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      4,
      3,
      { limit: 20, afterId: 40 },
    );

    const elementos = within(
      screen.getByRole("list"),
    ).getAllByRole("listitem");

    expect(elementos).toHaveLength(45);
    expect(elementos[0].textContent).toContain("Mensaje 1");
    expect(elementos[44].textContent).toContain("Mensaje 45");
  });

  it("no inicia otra consulta mientras una incremental sigue pendiente", async () => {
    const pendiente = crearPromesaPendiente();

    listarMensajesComerciales
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Mensaje inicial")]),
      )
      .mockReturnValueOnce(pendiente.promesa);

    render(<ChatCommercialMessages conversationId={3} />);

    await completarCargaInicial();
    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenCalledTimes(2);

    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenCalledTimes(2);

    await completarPromesa(
      pendiente,
      pagina([mensaje(11, "Respuesta pendiente")]),
    );

    expect(screen.getByText("Respuesta pendiente")).toBeTruthy();

    listarMensajesComerciales.mockResolvedValue(pagina());

    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      3,
      3,
      { limit: 20, afterId: 11 },
    );
  });

  it("conserva el historial tras un error temporal y reintenta", async () => {
    listarMensajesComerciales
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Mensaje conservado")]),
      )
      .mockRejectedValueOnce(new Error("Error de red"))
      .mockResolvedValueOnce(
        pagina([mensaje(11, "Mensaje recuperado")]),
      );

    render(<ChatCommercialMessages conversationId={3} />);

    await completarCargaInicial();
    await avanzarCincoSegundos();

    expect(screen.getByText("Mensaje conservado")).toBeTruthy();

    await avanzarCincoSegundos();

    expect(screen.getByText("Mensaje conservado")).toBeTruthy();
    expect(screen.getByText("Mensaje recuperado")).toBeTruthy();

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      3,
      3,
      { limit: 20, afterId: 10 },
    );
  });

  it("descarta una respuesta incremental al cambiar de conversacion", async () => {
    const pendiente = crearPromesaPendiente();

    listarMensajesComerciales
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Conversacion original", 3)]),
      )
      .mockReturnValueOnce(pendiente.promesa)
      .mockResolvedValueOnce(
        pagina([mensaje(30, "Conversacion nueva", 4)]),
      );

    const { rerender } = render(
      <ChatCommercialMessages
        key={3}
        conversationId={3}
      />,
    );

    await completarCargaInicial();
    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, afterId: 10 },
    );

    await act(async () => {
      rerender(
        <ChatCommercialMessages
          key={4}
          conversationId={4}
        />,
      );

      await Promise.resolve();
    });

    expect(screen.getByText("Conversacion nueva")).toBeTruthy();

    await completarPromesa(
      pendiente,
      pagina([mensaje(11, "Respuesta obsoleta", 3)]),
    );

    expect(screen.queryByText("Respuesta obsoleta")).toBeNull();
    expect(screen.queryByText("Conversacion original")).toBeNull();
    expect(screen.getByText("Conversacion nueva")).toBeTruthy();
  });

  it("no duplica un mensaje enviado por el agente cuando llega por polling", async () => {
    const respuestaAgente = mensaje(
      11,
      "Respuesta enviada por el agente",
    );

    listarMensajesComerciales
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Consulta del visitante")]),
      )
      .mockResolvedValueOnce(pagina([respuestaAgente]));

    const { rerender } = render(
      <ChatCommercialMessages conversationId={3} />,
    );

    await completarCargaInicial();

    await act(async () => {
      rerender(
        <ChatCommercialMessages
          conversationId={3}
          mensajesEnviados={[respuestaAgente]}
        />,
      );
    });

    expect(
      screen.getByText("Respuesta enviada por el agente"),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(listarMensajesComerciales).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, afterId: 10 },
    );

    expect(
      screen.getAllByText("Respuesta enviada por el agente"),
    ).toHaveLength(1);

    expect(
      within(screen.getByRole("list")).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(2);
  });
});
