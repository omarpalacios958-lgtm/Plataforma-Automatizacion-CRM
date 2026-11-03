// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

vi.mock("../src/services/chat-internal.service.js", () => ({
  listarConversacionesInternas: vi.fn(),
  obtenerMensajesInternos: vi.fn(),
}));

import {
  listarConversacionesInternas,
  obtenerMensajesInternos,
} from "../src/services/chat-internal.service.js";

import ChatInternalDetail from "../src/modules/chat/ChatInternalDetail.jsx";

const conversacion = {
  id: 2,
  tipo: "INTERNO_GRUPAL",
  estado: "EN_CURSO",
  nombre: "Equipo comercial CRM",
  participants: [
    {
      id: 7,
      userId: 3,
      user: {
        nombre: "Juan",
        apellido: "Pérez",
      },
    },
  ],
};

function renderizar(ruta = "/chat/interno/2") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/chat/interno/:conversationId"
          element={<ChatInternalDetail />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function CambiarConversacion() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/chat/interno/3")}
    >
      Cambiar conversación
    </button>
  );
}

function renderizarConNavegacion() {
  return render(
    <MemoryRouter initialEntries={["/chat/interno/2"]}>
      <CambiarConversacion />

      <Routes>
        <Route
          path="/chat/interno/:conversationId"
          element={<ChatInternalDetail />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CH-05.4.2 - Detalle de chat interno", () => {
  it("conserva el historial y permite reintentar una página fallida", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos
      .mockResolvedValueOnce({
        messages: [
          {
            id: 15,
            conversationId: 2,
            participantId: 7,
            contenido: "Mensaje reciente",
            createdAt: "2026-10-27T22:00:00.000Z",
            deletedAt: null,
          },
        ],
        nextCursor: 15,
      })
      .mockRejectedValueOnce(
        new Error("Error temporal de conexión."),
      )
      .mockResolvedValueOnce({
        messages: [
          {
            id: 10,
            conversationId: 2,
            participantId: 7,
            contenido: "Mensaje anterior",
            createdAt: "2026-10-27T21:00:00.000Z",
            deletedAt: null,
          },
        ],
        nextCursor: null,
      });

    renderizar();

    const boton = await screen.findByRole("button", {
      name: "Cargar mensajes anteriores",
    });

    fireEvent.click(boton);

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty(
      "textContent",
      "Error temporal de conexión.",
    );

    expect(
      screen.getByText("Mensaje reciente"),
    ).toBeTruthy();

    await waitFor(() => {
      expect(boton.disabled).toBe(false);
    });

    fireEvent.click(boton);

    expect(
      await screen.findByText("Mensaje anterior"),
    ).toBeTruthy();

    expect(
      screen.getByText("Mensaje reciente"),
    ).toBeTruthy();

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(3);
  });

  it("descarta mensajes obsoletos al cambiar de conversación", async () => {
    let resolverMensajesAnteriores;

    const mensajesPendientes = new Promise((resolve) => {
      resolverMensajesAnteriores = resolve;
    });

    const otraConversacion = {
      ...conversacion,
      id: 3,
      nombre: "Equipo de soporte",
    };

    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion, otraConversacion],
    });

    obtenerMensajesInternos.mockImplementation((id) => {
      if (id === 2) {
        return mensajesPendientes;
      }

      return Promise.resolve({
        messages: [
          {
            id: 30,
            conversationId: 3,
            participantId: 7,
            contenido: "Mensaje de soporte",
            createdAt: "2026-10-27T23:00:00.000Z",
            deletedAt: null,
          },
        ],
        nextCursor: null,
      });
    });

    renderizarConNavegacion();

    await waitFor(() => {
      expect(obtenerMensajesInternos).toHaveBeenCalledWith(
        2,
        { limit: 20 },
      );
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cambiar conversación",
      }),
    );

    expect(
      await screen.findByText("Mensaje de soporte"),
    ).toBeTruthy();

    resolverMensajesAnteriores({
      messages: [
        {
          id: 15,
          conversationId: 2,
          participantId: 7,
          contenido: "Mensaje antiguo",
          createdAt: "2026-10-27T22:00:00.000Z",
          deletedAt: null,
        },
      ],
      nextCursor: null,
    });

    await waitFor(() => {
      expect(
        screen.getByText("Equipo de soporte"),
      ).toBeTruthy();
    });

    expect(
      screen.queryByText("Mensaje antiguo"),
    ).toBeNull();

    expect(
      screen.getByText("Mensaje de soporte"),
    ).toBeTruthy();
  });

  it("muestra conversación, remitente y mensajes", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos.mockResolvedValue({
      messages: [
        {
          id: 15,
          conversationId: 2,
          participantId: 7,
          contenido: "Hola, equipo.",
          createdAt: "2026-10-27T22:00:00.000Z",
          deletedAt: null,
        },
      ],
      nextCursor: null,
    });

    renderizar();

    expect(
      await screen.findByText("Equipo comercial CRM"),
    ).toBeTruthy();

    expect(screen.getByText("Hola, equipo.")).toBeTruthy();
    expect(screen.getAllByText("Juan Pérez").length).toBeGreaterThan(0);

    expect(obtenerMensajesInternos).toHaveBeenCalledWith(
      2,
      { limit: 20 },
    );
  });

  it("muestra estado vacío cuando no hay mensajes", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos.mockResolvedValue({
      messages: [],
      nextCursor: null,
    });

    renderizar();

    expect(
      await screen.findByText(
        "Todavía no hay mensajes en esta conversación.",
      ),
    ).toBeTruthy();
  });

  it("rechaza un identificador inválido", async () => {
    renderizar("/chat/interno/abc");

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty(
      "textContent",
      expect.stringContaining("Identificador de conversación inválido."),
    );

    expect(listarConversacionesInternas).not.toHaveBeenCalled();
    expect(obtenerMensajesInternos).not.toHaveBeenCalled();
  });

  it("no consulta mensajes de una conversación no disponible", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [],
    });

    renderizar();

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty(
      "textContent",
      expect.stringContaining("Conversación interna no encontrada."),
    );

    expect(obtenerMensajesInternos).not.toHaveBeenCalled();
  });

  it("permite cargar mensajes anteriores", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos
      .mockResolvedValueOnce({
        messages: [
          {
            id: 15,
            conversationId: 2,
            participantId: 7,
            contenido: "Mensaje reciente",
            createdAt: "2026-10-27T22:00:00.000Z",
          },
        ],
        nextCursor: 15,
      })
      .mockResolvedValueOnce({
        messages: [
          {
            id: 10,
            conversationId: 2,
            participantId: 7,
            contenido: "Mensaje anterior",
            createdAt: "2026-10-27T21:00:00.000Z",
          },
        ],
        nextCursor: null,
      });

    renderizar();

    const boton = await screen.findByRole("button", {
      name: "Cargar mensajes anteriores",
    });

    fireEvent.click(boton);

    await waitFor(() => {
      expect(
        screen.getByText("Mensaje anterior"),
      ).toBeTruthy();
    });

    expect(obtenerMensajesInternos).toHaveBeenLastCalledWith(
      2,
      { limit: 20, cursor: 15 },
    );
  });

  it("muestra mensajes eliminados sin revelar su contenido", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos.mockResolvedValue({
      messages: [
        {
          id: 16,
          conversationId: 2,
          participantId: 7,
          contenido: "Contenido eliminado",
          createdAt: "2026-10-27T22:00:00.000Z",
          deletedAt: "2026-10-27T22:05:00.000Z",
        },
      ],
      nextCursor: null,
    });

    renderizar();

    expect(
      await screen.findByText("Mensaje eliminado"),
    ).toBeTruthy();

    expect(
      screen.queryByText("Contenido eliminado"),
    ).toBeNull();
  });
});