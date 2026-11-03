
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

import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

vi.mock("../src/services/chat-internal.service.js", () => ({
  listarConversacionesInternas: vi.fn(),
  obtenerMensajesInternos: vi.fn(),
  enviarMensajeInterno: vi.fn(),
}));

import {
  listarConversacionesInternas,
  obtenerMensajesInternos,
  enviarMensajeInterno,
} from "../src/services/chat-internal.service.js";

import ChatInternalDetail from "../src/modules/chat/ChatInternalDetail.jsx";

const conversacion = {
  id: 2,
  tipo: "INTERNO_GRUPAL",
  estado: "EN_CURSO",
  nombre: "Equipo CRM",
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

const mensajeConfirmado = {
  id: 25,
  conversationId: 2,
  participantId: 7,
  contenido: "Hola, equipo.",
  clientMessageId: "123e4567-e89b-42d3-a456-426614174000",
  createdAt: "2026-11-03T12:00:00.000Z",
  editedAt: null,
  deletedAt: null,
};

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

function renderizar(conNavegacion = false) {
  return render(
    <MemoryRouter initialEntries={["/chat/interno/2"]}>
      {conNavegacion && <CambiarConversacion />}

      <Routes>
        <Route
          path="/chat/interno/:conversationId"
          element={<ChatInternalDetail />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function escribir(texto) {
  fireEvent.change(
    screen.getByRole("textbox", { name: "Mensaje" }),
    {
      target: { value: texto },
    },
  );
}

function pulsarEnviar() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Enviar mensaje",
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(
      () => "123e4567-e89b-42d3-a456-426614174000",
    ),
  });

  listarConversacionesInternas.mockResolvedValue({
    conversations: [conversacion],
  });

  obtenerMensajesInternos.mockResolvedValue({
    messages: [],
    nextCursor: null,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("CH-05.5.2 - Envío desde el detalle interno", () => {
  it("envía el mensaje y actualiza el historial", async () => {
    enviarMensajeInterno.mockResolvedValue({
      success: true,
      data: mensajeConfirmado,
    });

    renderizar();

    await screen.findByText("Equipo CRM");

    escribir("  Hola, equipo.  ");
    pulsarEnviar();

    await waitFor(() => {
      expect(enviarMensajeInterno).toHaveBeenCalledWith(
        2,
        {
          contenido: "Hola, equipo.",
          clientMessageId:
            "123e4567-e89b-42d3-a456-426614174000",
        },
      );
    });

    expect(
      await screen.findByText("Hola, equipo."),
    ).toBeTruthy();

    expect(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }).value,
    ).toBe("");

    expect(
      screen.getAllByText("Hola, equipo."),
    ).toHaveLength(1);
  });

  it("impide enviar contenido vacío", async () => {
    renderizar();

    await screen.findByText("Equipo CRM");

    const boton = screen.getByRole("button", {
      name: "Enviar mensaje",
    });

    expect(boton.disabled).toBe(true);

    escribir("   ");

    expect(boton.disabled).toBe(true);
    expect(enviarMensajeInterno).not.toHaveBeenCalled();
  });

  it("bloquea envíos simultáneos", async () => {
    let resolverEnvio;

    enviarMensajeInterno.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolverEnvio = resolve;
        }),
    );

    renderizar();

    await screen.findByText("Equipo CRM");

    escribir("Hola, equipo.");
    pulsarEnviar();

    expect(
      screen.getByRole("button", {
        name: "Enviando...",
      }).disabled,
    ).toBe(true);

    expect(enviarMensajeInterno).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolverEnvio({
        success: true,
        data: mensajeConfirmado,
      });
    });

    expect(
      screen.getByText("Hola, equipo."),
    ).toBeTruthy();
  });

  it("conserva texto e identificador tras error y reintento", async () => {
    enviarMensajeInterno
      .mockRejectedValueOnce(
        new Error("Error temporal de conexión."),
      )
      .mockResolvedValueOnce({
        success: true,
        message: "Mensaje existente.",
        data: mensajeConfirmado,
      });

    renderizar();

    await screen.findByText("Equipo CRM");

    escribir("Hola, equipo.");
    pulsarEnviar();

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty(
      "textContent",
      "Error temporal de conexión.",
    );

    expect(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }).value,
    ).toBe("Hola, equipo.");

    pulsarEnviar();

    expect(
      await screen.findByText("Hola, equipo."),
    ).toBeTruthy();

    expect(enviarMensajeInterno).toHaveBeenCalledTimes(2);

    expect(
      enviarMensajeInterno.mock.calls[0][1],
    ).toEqual(
      enviarMensajeInterno.mock.calls[1][1],
    );

    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("genera un identificador nuevo si cambia el texto tras un error", async () => {
    crypto.randomUUID
      .mockReturnValueOnce("mensaje_interno_0001")
      .mockReturnValueOnce("mensaje_interno_0002");

    enviarMensajeInterno
      .mockRejectedValueOnce(new Error("Error de conexión."))
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...mensajeConfirmado,
          contenido: "Mensaje corregido",
          clientMessageId: "mensaje_interno_0002",
        },
      });

    renderizar();

    await screen.findByText("Equipo CRM");

    escribir("Hola, equipo.");
    pulsarEnviar();

    await screen.findByRole("alert");

    escribir("Mensaje corregido");
    pulsarEnviar();

    expect(
      await screen.findByText("Mensaje corregido"),
    ).toBeTruthy();

    expect(
      enviarMensajeInterno.mock.calls[0][1]
        .clientMessageId,
    ).toBe("mensaje_interno_0001");

    expect(
      enviarMensajeInterno.mock.calls[1][1]
        .clientMessageId,
    ).toBe("mensaje_interno_0002");
  });

  it("descarta la respuesta del envío al cambiar de conversación", async () => {
    let resolverEnvio;

    const envioPendiente = new Promise((resolve) => {
      resolverEnvio = resolve;
    });

    const otraConversacion = {
      ...conversacion,
      id: 3,
      nombre: "Equipo soporte",
    };

    listarConversacionesInternas.mockResolvedValue({
      conversations: [
        conversacion,
        otraConversacion,
      ],
    });

    enviarMensajeInterno.mockReturnValue(envioPendiente);

    renderizar(true);

    await screen.findByText("Equipo CRM");

    escribir("Hola, equipo.");
    pulsarEnviar();

    await waitFor(() => {
      expect(enviarMensajeInterno).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cambiar conversación",
      }),
    );

    await screen.findByText("Equipo soporte");

    await act(async () => {
      resolverEnvio({
        success: true,
        data: mensajeConfirmado,
      });
    });

    expect(
      screen.queryByText("Hola, equipo."),
    ).toBeNull();

    expect(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }).value,
    ).toBe("");
  });

  it("no duplica un mensaje confirmado que ya está en el historial", async () => {
    obtenerMensajesInternos.mockResolvedValue({
      messages: [mensajeConfirmado],
      nextCursor: null,
    });

    enviarMensajeInterno.mockResolvedValue({
      success: true,
      data: mensajeConfirmado,
    });

    renderizar();

    await screen.findByText("Equipo CRM");

    escribir("Hola, equipo.");
    pulsarEnviar();

    await waitFor(() => {
      expect(enviarMensajeInterno).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getAllByText("Hola, equipo."),
    ).toHaveLength(1);
  });

  it("conserva el historial ante un error de permisos", async () => {
    obtenerMensajesInternos.mockResolvedValue({
      messages: [
        {
          ...mensajeConfirmado,
          id: 20,
          contenido: "Mensaje anterior",
        },
      ],
      nextCursor: null,
    });

    enviarMensajeInterno.mockRejectedValue(
      Object.assign(
        new Error("Conversación no encontrada."),
        { status: 404 },
      ),
    );

    renderizar();

    await screen.findByText("Mensaje anterior");

    escribir("Hola, equipo.");
    pulsarEnviar();

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty(
      "textContent",
      "Conversación no encontrada.",
    );

    expect(
      screen.getByText("Mensaje anterior"),
    ).toBeTruthy();

    // El mensaje rechazado no debe incorporarse al historial.
    const historial = screen.getByRole("region", {
      name: "Historial interno",
    });

    expect(historial.textContent).not.toContain(
      "Hola, equipo.",
    );

    // El texto debe permanecer en el formulario.
    expect(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }).value,
    ).toBe("Hola, equipo.");
  });
});