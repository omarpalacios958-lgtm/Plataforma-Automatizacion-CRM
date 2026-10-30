
/* @vitest-environment jsdom */

import { StrictMode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
  listarMensajesVisitante: vi.fn(),
}));

function mensaje(id, contenido) {
  return {
    id,
    conversationId: 3,
    participantId: 5,
    contenido,
    clientMessageId: `mensaje_${id}_prueba`,
    createdAt: "2026-10-30T12:00:00.000Z",
    editedAt: null,
    deletedAt: null,
  };
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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ChatVisitorMessages - historial", () => {
  it("muestra un estado vacío cuando no hay mensajes", async () => {
    listarMensajesVisitante.mockResolvedValue({
      messages: [],
      nextCursor: null,
    });

    render(<ChatVisitorMessages conversationId={3} />);

    expect(
      await screen.findByText(
        "Todavía no hay mensajes en esta conversación.",
      ),
    ).toBeTruthy();

    expect(listarMensajesVisitante).toHaveBeenCalledWith(3, {
      limit: 20,
    });
  });

  it("muestra los mensajes en orden cronológico", async () => {
    listarMensajesVisitante.mockResolvedValue({
      messages: [
        mensaje(3, "Mensaje reciente"),
        mensaje(2, "Mensaje intermedio"),
        mensaje(1, "Mensaje antiguo"),
      ],
      nextCursor: null,
    });

    render(<ChatVisitorMessages conversationId={3} />);

    const lista = await screen.findByRole("list");
    const elementos = within(lista).getAllByRole("listitem");

    expect(elementos).toHaveLength(3);
    expect(elementos[0].textContent).toContain("Mensaje antiguo");
    expect(elementos[1].textContent).toContain("Mensaje intermedio");
    expect(elementos[2].textContent).toContain("Mensaje reciente");
  });

  it("carga mensajes anteriores usando nextCursor", async () => {
    listarMensajesVisitante
      .mockResolvedValueOnce({
        messages: [
          mensaje(4, "Cuarto"),
          mensaje(3, "Tercero"),
        ],
        nextCursor: 3,
      })
      .mockResolvedValueOnce({
        messages: [
          mensaje(2, "Segundo"),
          mensaje(1, "Primero"),
        ],
        nextCursor: null,
      });

    render(<ChatVisitorMessages conversationId={3} />);

    const boton = await screen.findByRole("button", {
      name: "Cargar mensajes anteriores",
    });

    fireEvent.click(boton);

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(4);
    });

    expect(listarMensajesVisitante).toHaveBeenNthCalledWith(
      2,
      3,
      { limit: 20, cursor: 3 },
    );

    const elementos = screen.getAllByRole("listitem");

    expect(elementos.map((elemento) => elemento.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Primero"),
        expect.stringContaining("Segundo"),
        expect.stringContaining("Tercero"),
        expect.stringContaining("Cuarto"),
      ]),
    );

    expect(elementos[0].textContent).toContain("Primero");
    expect(elementos[3].textContent).toContain("Cuarto");

    expect(
      screen.queryByRole("button", {
        name: "Cargar mensajes anteriores",
      }),
    ).toBeNull();
  });

  it("permite reintentar si falla la consulta inicial", async () => {
    listarMensajesVisitante
      .mockRejectedValueOnce(new Error("Error de red"))
      .mockResolvedValueOnce({
        messages: [mensaje(1, "Mensaje recuperado")],
        nextCursor: null,
      });

    render(<ChatVisitorMessages conversationId={3} />);

    expect(
      await screen.findByText(
        "No fue posible consultar los mensajes.",
      ),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reintentar mensajes",
      }),
    );

    expect(
      await screen.findByText("Mensaje recuperado"),
    ).toBeTruthy();

    expect(listarMensajesVisitante).toHaveBeenCalledTimes(2);
  });

  it("conserva los mensajes cuando falla una página anterior", async () => {
    listarMensajesVisitante
      .mockResolvedValueOnce({
        messages: [mensaje(3, "Mensaje conservado")],
        nextCursor: 3,
      })
      .mockRejectedValueOnce(new Error("Error de red"))
      .mockResolvedValueOnce({
        messages: [mensaje(2, "Mensaje anterior")],
        nextCursor: null,
      });

    render(<ChatVisitorMessages conversationId={3} />);

    const boton = await screen.findByRole("button", {
      name: "Cargar mensajes anteriores",
    });

    fireEvent.click(boton);

    expect(
      await screen.findByText(
        "No fue posible cargar mensajes anteriores. Puedes reintentar.",
      ),
    ).toBeTruthy();

    expect(screen.getByText("Mensaje conservado")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cargar mensajes anteriores",
      }),
    );

    expect(
      await screen.findByText("Mensaje anterior"),
    ).toBeTruthy();

    expect(screen.getByText("Mensaje conservado")).toBeTruthy();
  });

  it("no duplica mensajes entre páginas", async () => {
    listarMensajesVisitante
      .mockResolvedValueOnce({
        messages: [mensaje(3, "Tercero"), mensaje(2, "Segundo")],
        nextCursor: 2,
      })
      .mockResolvedValueOnce({
        messages: [mensaje(2, "Segundo"), mensaje(1, "Primero")],
        nextCursor: null,
      });

    render(<ChatVisitorMessages conversationId={3} />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Cargar mensajes anteriores",
      }),
    );

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(3);
    });

    expect(screen.getAllByText("Segundo")).toHaveLength(1);
  });

  it("descarta la respuesta inicial al desmontarse", async () => {
    const pendiente = crearPromesaPendiente();

    listarMensajesVisitante.mockReturnValue(pendiente.promesa);

    const { unmount } = render(
      <ChatVisitorMessages conversationId={3} />,
    );

    expect(screen.getByText("Cargando mensajes...")).toBeTruthy();

    unmount();

    pendiente.resolver({
      messages: [mensaje(1, "Mensaje tardío")],
      nextCursor: null,
    });

    await Promise.resolve();

    expect(screen.queryByText("Mensaje tardío")).toBeNull();
  });

  it("descarta una respuesta obsoleta al cambiar de conversación", async () => {
    const pendiente = crearPromesaPendiente();

    listarMensajesVisitante
      .mockReturnValueOnce(pendiente.promesa)
      .mockResolvedValueOnce({
        messages: [mensaje(8, "Conversación nueva")],
        nextCursor: null,
      });

    const { rerender } = render(
      <ChatVisitorMessages key={3} conversationId={3} />,
    );

    rerender(<ChatVisitorMessages key={4} conversationId={4} />);

    expect(
      await screen.findByText("Conversación nueva"),
    ).toBeTruthy();

    pendiente.resolver({
      messages: [mensaje(1, "Conversación anterior")],
      nextCursor: null,
    });

    await Promise.resolve();

    expect(
      screen.queryByText("Conversación anterior"),
    ).toBeNull();
  });

  it("funciona bajo StrictMode", async () => {
    listarMensajesVisitante.mockResolvedValue({
      messages: [mensaje(1, "Mensaje válido")],
      nextCursor: null,
    });

    render(
      <StrictMode>
        <ChatVisitorMessages conversationId={3} />
      </StrictMode>,
    );

    expect(
      await screen.findByText("Mensaje válido"),
    ).toBeTruthy();
  });
});
