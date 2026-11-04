
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

import ChatVisitorMessages from "../src/modules/chat/ChatVisitorMessages.jsx";
import { listarMensajesVisitante } from "../src/services/chat-visitor.service.js";

vi.mock("../src/services/chat-visitor.service.js", () => ({
  enviarMensajeVisitante: vi.fn(),
  listarMensajesVisitante: vi.fn(),
}));

function mensaje(id, contenido, conversationId = 3) {
  return {
    id,
    conversationId,
    participantId: 5,
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
  let rechazar;

  const promesa = new Promise((resolve, reject) => {
    resolver = resolve;
    rechazar = reject;
  });

  return { promesa, resolver, rechazar };
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("ChatVisitorMessages - polling incremental", () => {
  it("recupera mensajes nuevos despues de cinco segundos", async () => {
    listarMensajesVisitante
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Mensaje inicial")]),
      )
      .mockResolvedValueOnce(
        pagina([mensaje(11, "Mensaje recibido")]),
      )
      .mockResolvedValue(pagina());

    render(<ChatVisitorMessages conversationId={3} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText("Mensaje inicial"),
    ).toBeTruthy();

    expect(listarMensajesVisitante).toHaveBeenCalledTimes(1);

    await avanzarCincoSegundos();

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, afterId: 10 },
    );

    expect(
      screen.getByText("Mensaje recibido"),
    ).toBeTruthy();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("no consulta incrementales mientras la carga inicial esta pendiente", async () => {
    const pendiente = crearPromesaPendiente();

    listarMensajesVisitante.mockReturnValueOnce(
      pendiente.promesa,
    );

    render(<ChatVisitorMessages conversationId={3} />);

    expect(
      screen.getByText("Cargando mensajes..."),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(listarMensajesVisitante).toHaveBeenCalledTimes(1);

    await completarPromesa(
      pendiente,
      pagina([mensaje(5, "Carga inicial completada")]),
    );

    expect(
      screen.getByText("Carga inicial completada"),
    ).toBeTruthy();

    listarMensajesVisitante.mockResolvedValue(pagina());

    await avanzarCincoSegundos();

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
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

    listarMensajesVisitante
      .mockResolvedValueOnce(pagina())
      .mockResolvedValueOnce(pagina(primeros, 20))
      .mockResolvedValueOnce(pagina(siguientes, 40))
      .mockResolvedValueOnce(pagina(ultimos));

    render(<ChatVisitorMessages conversationId={3} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText(
        "Todavía no hay mensajes en esta conversación.",
      ),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(listarMensajesVisitante).toHaveBeenCalledTimes(4);

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, afterId: 0 },
    );

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
      3,
      3,
      { limit: 20, afterId: 20 },
    );

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
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

    listarMensajesVisitante
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Mensaje inicial")]),
      )
      .mockReturnValueOnce(pendiente.promesa);

    render(<ChatVisitorMessages conversationId={3} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText("Mensaje inicial"),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(listarMensajesVisitante).toHaveBeenCalledTimes(2);

    await avanzarCincoSegundos();

    expect(listarMensajesVisitante).toHaveBeenCalledTimes(2);

    await completarPromesa(
      pendiente,
      pagina([mensaje(11, "Respuesta pendiente")]),
    );

    expect(
      screen.getByText("Respuesta pendiente"),
    ).toBeTruthy();

    listarMensajesVisitante.mockResolvedValue(pagina());

    await avanzarCincoSegundos();

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
      3,
      3,
      { limit: 20, afterId: 11 },
    );
  });

  it("conserva el historial tras un error temporal y reintenta", async () => {
    listarMensajesVisitante
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Mensaje conservado")]),
      )
      .mockRejectedValueOnce(new Error("Error de red"))
      .mockResolvedValueOnce(
        pagina([mensaje(11, "Mensaje recuperado")]),
      );

    render(<ChatVisitorMessages conversationId={3} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText("Mensaje conservado"),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(
      screen.getByText("Mensaje conservado"),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(
      screen.getByText("Mensaje recuperado"),
    ).toBeTruthy();

    expect(
      screen.getByText("Mensaje conservado"),
    ).toBeTruthy();

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
      3,
      3,
      { limit: 20, afterId: 10 },
    );
  });

  it("descarta una respuesta incremental al cambiar de conversacion", async () => {
    const pendiente = crearPromesaPendiente();

    listarMensajesVisitante
      .mockResolvedValueOnce(
        pagina([mensaje(10, "Conversacion original", 3)]),
      )
      .mockReturnValueOnce(pendiente.promesa)
      .mockResolvedValueOnce(
        pagina([mensaje(30, "Conversacion nueva", 4)]),
      );

    const { rerender } = render(
      <ChatVisitorMessages
        key={3}
        conversationId={3}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText("Conversacion original"),
    ).toBeTruthy();

    await avanzarCincoSegundos();

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, afterId: 10 },
    );

    await act(async () => {
      rerender(
        <ChatVisitorMessages
          key={4}
          conversationId={4}
        />,
      );

      await Promise.resolve();
    });

    expect(
      screen.getByText("Conversacion nueva"),
    ).toBeTruthy();

    await completarPromesa(
      pendiente,
      pagina([mensaje(11, "Respuesta obsoleta", 3)]),
    );

    expect(
      screen.queryByText("Respuesta obsoleta"),
    ).toBeNull();

    expect(
      screen.queryByText("Conversacion original"),
    ).toBeNull();

    expect(
      screen.getByText("Conversacion nueva"),
    ).toBeTruthy();
  });
});
