
// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import ChatCommercialMessages from "../src/modules/chat/ChatCommercialMessages.jsx";

import { listarMensajesComerciales } from "../src/services/chat-commercial.service.js";

vi.mock("../src/services/chat-commercial.service.js", () => ({
  listarMensajesComerciales: vi.fn(),
}));

function mensaje(id, contenido, conversationId = 3) {
  return {
    id,
    conversationId,
    participantId: 7,
    contenido,
    clientMessageId: `mensaje-${id}`,
    createdAt: "2026-11-01T10:00:00.000Z",
    editedAt: null,
    deletedAt: null,
  };
}

function pagina(messages = [], nextCursor = null) {
  return { messages, nextCursor };
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();

  listarMensajesComerciales.mockResolvedValue(
    pagina([mensaje(3, "Mensaje reciente")]),
  );
});

describe("ChatCommercialMessages - historial comercial", () => {
  it("consulta inicialmente los mensajes de la conversación", async () => {
    render(<ChatCommercialMessages conversationId={3} />);

    expect(
      screen.getByText("Cargando mensajes comerciales..."),
    ).toBeTruthy();

    expect(
      await screen.findByText("Mensaje reciente"),
    ).toBeTruthy();

    expect(listarMensajesComerciales).toHaveBeenCalledWith(
      3,
      { limit: 20 },
    );
  });

  it("muestra los mensajes en orden cronológico", async () => {
    listarMensajesComerciales.mockResolvedValue(
      pagina([
        mensaje(3, "Tercero"),
        mensaje(2, "Segundo"),
        mensaje(1, "Primero"),
      ]),
    );

    render(<ChatCommercialMessages conversationId={3} />);

    await screen.findByText("Primero");

    const elementos = screen.getAllByRole("listitem");

    expect(
      elementos.map((elemento) =>
        elemento.querySelector("p").textContent,
      ),
    ).toEqual(["Primero", "Segundo", "Tercero"]);
  });

  it("muestra un historial vacío", async () => {
    listarMensajesComerciales.mockResolvedValue(
      pagina(),
    );

    render(<ChatCommercialMessages conversationId={3} />);

    expect(
      await screen.findByText(
        "Todavía no hay mensajes en esta conversación.",
      ),
    ).toBeTruthy();
  });

  it("carga mensajes anteriores mediante cursor", async () => {
    listarMensajesComerciales
      .mockResolvedValueOnce(
        pagina([mensaje(3, "Tercero")], 3),
      )
      .mockResolvedValueOnce(
        pagina([
          mensaje(2, "Segundo"),
          mensaje(1, "Primero"),
        ]),
      );

    render(<ChatCommercialMessages conversationId={3} />);

    await screen.findByText("Tercero");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cargar mensajes anteriores",
      }),
    );

    await screen.findByText("Primero");

    expect(listarMensajesComerciales).toHaveBeenCalledWith(
      3,
      { limit: 20, cursor: 3 },
    );

    const elementos = screen.getAllByRole("listitem");

    expect(
      elementos.map((elemento) =>
        elemento.querySelector("p").textContent,
      ),
    ).toEqual(["Primero", "Segundo", "Tercero"]);
  });

  it("evita duplicar mensajes entre páginas", async () => {
    listarMensajesComerciales
      .mockResolvedValueOnce(
        pagina([mensaje(3, "Tercero")], 3),
      )
      .mockResolvedValueOnce(
        pagina([
          mensaje(3, "Tercero"),
          mensaje(2, "Segundo"),
        ]),
      );

    render(<ChatCommercialMessages conversationId={3} />);

    await screen.findByText("Tercero");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cargar mensajes anteriores",
      }),
    );

    await screen.findByText("Segundo");

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("permite reintentar una consulta fallida", async () => {
    listarMensajesComerciales
      .mockRejectedValueOnce(
        new Error("Error de conexión"),
      )
      .mockResolvedValueOnce(
        pagina([mensaje(3, "Recuperado")]),
      );

    render(<ChatCommercialMessages conversationId={3} />);

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain("Error de conexión");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reintentar mensajes",
      }),
    );

    expect(
      await screen.findByText("Recuperado"),
    ).toBeTruthy();

    expect(listarMensajesComerciales).toHaveBeenCalledTimes(2);
  });

  it("rechaza mensajes de otra conversación", async () => {
    listarMensajesComerciales.mockResolvedValue(
      pagina([mensaje(4, "Mensaje ajeno", 99)]),
    );

    render(<ChatCommercialMessages conversationId={3} />);

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain(
      "Los mensajes no pertenecen a la conversación.",
    );

    expect(screen.queryByText("Mensaje ajeno")).toBeNull();
  });

  it("muestra mensajes eliminados sin revelar su contenido", async () => {
    listarMensajesComerciales.mockResolvedValue(
      pagina([
        {
          ...mensaje(3, "Contenido privado"),
          deletedAt: "2026-11-01T11:00:00.000Z",
        },
      ]),
    );

    render(<ChatCommercialMessages conversationId={3} />);

    expect(
      await screen.findByText("Mensaje eliminado"),
    ).toBeTruthy();

    expect(
      screen.queryByText("Contenido privado"),
    ).toBeNull();
  });

  it("ignora una respuesta antigua después de cambiar de conversación", async () => {
    let resolverPrimera;

    listarMensajesComerciales
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolverPrimera = resolve;
          }),
      )
      .mockResolvedValueOnce(
        pagina([mensaje(8, "Mensaje actual", 4)]),
      );

    const vista = render(
      <ChatCommercialMessages conversationId={3} />,
    );

    vista.rerender(
      <ChatCommercialMessages conversationId={4} />,
    );

    expect(
      await screen.findByText("Mensaje actual"),
    ).toBeTruthy();

    await act(async () => {
      resolverPrimera(
        pagina([mensaje(3, "Mensaje antiguo", 3)]),
      );
    });

    expect(
      screen.queryByText("Mensaje antiguo"),
    ).toBeNull();

    expect(
      screen.getByText("Mensaje actual"),
    ).toBeTruthy();

    expect(listarMensajesComerciales).toHaveBeenCalledWith(
      4,
      { limit: 20 },
    );
  });

  it("ignora respuestas antiguas de paginación al cambiar de conversación", async () => {
    let resolverAnteriores;

    listarMensajesComerciales
      .mockResolvedValueOnce(
        pagina([mensaje(3, "Mensaje inicial")], 3),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolverAnteriores = resolve;
          }),
      )
      .mockResolvedValueOnce(
        pagina([mensaje(8, "Nueva conversación", 4)]),
      );

    const vista = render(
      <ChatCommercialMessages conversationId={3} />,
    );

    await screen.findByText("Mensaje inicial");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cargar mensajes anteriores",
      }),
    );

    await waitFor(() => {
      expect(
        listarMensajesComerciales,
      ).toHaveBeenCalledTimes(2);
    });

    vista.rerender(
      <ChatCommercialMessages conversationId={4} />,
    );

    expect(
      await screen.findByText("Nueva conversación"),
    ).toBeTruthy();

    await act(async () => {
      resolverAnteriores(
        pagina([mensaje(2, "Mensaje antiguo")]),
      );
    });

    expect(
      screen.queryByText("Mensaje antiguo"),
    ).toBeNull();

    expect(
      screen.getByText("Nueva conversación"),
    ).toBeTruthy();
  });
});
