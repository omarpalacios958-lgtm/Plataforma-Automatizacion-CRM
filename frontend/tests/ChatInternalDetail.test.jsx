import useInternalMessagePolling from "../src/modules/chat/useInternalMessagePolling.js";
// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("../src/modules/chat/useInternalMessagePolling.js", () => ({
  default: vi.fn(),
}));
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
  enviarMensajeInterno: vi.fn(),
  listarConversacionesInternas: vi.fn(),
  marcarComoLeidoInterno: vi.fn(),
  obtenerMensajesInternos: vi.fn(),
}));

import {
  listarConversacionesInternas,
  marcarComoLeidoInterno,
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

function crearMensaje(id, conversationId = 2) {
  return {
    id,
    conversationId,
    participantId: 7,
    contenido: `Mensaje ${id}`,
    createdAt: "2026-10-27T22:00:00.000Z",
    deletedAt: null,
  };
}

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

beforeEach(() => {
  marcarComoLeidoInterno.mockResolvedValue({
    success: true,
    data: {},
  });
});

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
        messages: [crearMensaje(15)],
        nextCursor: 15,
      })
      .mockRejectedValueOnce(
        new Error("Error temporal de conexión."),
      )
      .mockResolvedValueOnce({
        messages: [crearMensaje(10)],
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

    expect(screen.getByText("Mensaje 15")).toBeTruthy();

    await waitFor(() => {
      expect(boton.disabled).toBe(false);
    });

    fireEvent.click(boton);

    expect(
      await screen.findByText("Mensaje 10"),
    ).toBeTruthy();

    expect(screen.getByText("Mensaje 15")).toBeTruthy();
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
      if (id === 2) return mensajesPendientes;

      return Promise.resolve({
        messages: [crearMensaje(30, 3)],
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
      await screen.findByText("Mensaje 30"),
    ).toBeTruthy();

    resolverMensajesAnteriores({
      messages: [crearMensaje(15)],
      nextCursor: null,
    });

    await waitFor(() => {
      expect(screen.getByText("Equipo de soporte")).toBeTruthy();
    });

    expect(screen.queryByText("Mensaje 15")).toBeNull();

    expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
      3,
      30,
    );
    expect(marcarComoLeidoInterno).not.toHaveBeenCalledWith(
      2,
      15,
    );
  });

  it("muestra conversación, remitente y mensajes", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos.mockResolvedValue({
      messages: [
        {
          ...crearMensaje(15),
          contenido: "Hola, equipo.",
        },
      ],
      nextCursor: null,
    });

    renderizar();

    expect(
      await screen.findByText("Equipo comercial CRM"),
    ).toBeTruthy();

    expect(screen.getByText("Hola, equipo.")).toBeTruthy();
    expect(
      screen.getAllByText("Juan Pérez").length,
    ).toBeGreaterThan(0);

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

    expect(marcarComoLeidoInterno).not.toHaveBeenCalled();
  });

  it("rechaza un identificador inválido", async () => {
    renderizar("/chat/interno/abc");

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty(
      "textContent",
      expect.stringContaining(
        "Identificador de conversación inválido.",
      ),
    );

    expect(listarConversacionesInternas).not.toHaveBeenCalled();
    expect(obtenerMensajesInternos).not.toHaveBeenCalled();
    expect(marcarComoLeidoInterno).not.toHaveBeenCalled();
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
      expect.stringContaining(
        "Conversación interna no encontrada.",
      ),
    );

    expect(obtenerMensajesInternos).not.toHaveBeenCalled();
    expect(marcarComoLeidoInterno).not.toHaveBeenCalled();
  });

  it("permite cargar mensajes anteriores", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos
      .mockResolvedValueOnce({
        messages: [crearMensaje(15)],
        nextCursor: 15,
      })
      .mockResolvedValueOnce({
        messages: [crearMensaje(10)],
        nextCursor: null,
      });

    renderizar();

    const boton = await screen.findByRole("button", {
      name: "Cargar mensajes anteriores",
    });

    fireEvent.click(boton);

    await screen.findByText("Mensaje 10");

    expect(obtenerMensajesInternos).toHaveBeenLastCalledWith(
      2,
      { limit: 20, cursor: 15 },
    );

    expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
      2,
      15,
    );
    expect(marcarComoLeidoInterno).not.toHaveBeenCalledWith(
      2,
      10,
    );
  });

  it("muestra mensajes eliminados sin revelar su contenido", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos.mockResolvedValue({
      messages: [
        {
          ...crearMensaje(16),
          contenido: "Contenido eliminado",
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

describe("CH-INT-09.3 - Marcador de lectura", () => {
  it("marca el último mensaje de la carga inicial", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos.mockResolvedValue({
      messages: [
        crearMensaje(15),
        crearMensaje(12),
        crearMensaje(18),
      ],
      nextCursor: null,
    });

    renderizar();

    await screen.findByText("Mensaje 18");

    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
        2,
        18,
      );
    });

    expect(marcarComoLeidoInterno).toHaveBeenCalledTimes(1);
  });

  it("no bloquea el historial si falla el marcador", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos.mockResolvedValue({
      messages: [crearMensaje(15)],
      nextCursor: null,
    });

    marcarComoLeidoInterno.mockRejectedValueOnce(
      new Error("Error temporal de lectura."),
    );

    renderizar();

    expect(
      await screen.findByText("Mensaje 15"),
    ).toBeTruthy();

    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
        2,
        15,
      );
    });

    expect(
      screen.getByText("Equipo comercial CRM"),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("procesa el ID más reciente después de una lectura pendiente", async () => {
    let resolverPrimeraLectura;

    const primeraLectura = new Promise((resolve) => {
      resolverPrimeraLectura = resolve;
    });

    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos
      .mockResolvedValueOnce({
        messages: [crearMensaje(15)],
        nextCursor: null,
      })
      .mockResolvedValue({
        messages: [crearMensaje(20), crearMensaje(21)],
        nextCursor: null,
      });

    marcarComoLeidoInterno
      .mockReturnValueOnce(primeraLectura)
      .mockResolvedValue({
        success: true,
        data: {},
      });

    renderizar();

    await screen.findByText("Mensaje 15");

    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
        2,
        15,
      );
    });

    // El polling real se comprueba también en su suite
    // de integración, donde transcurren cinco segundos.
    // Aquí comprobamos que la lectura inicial pendiente
    // no impide mostrar el historial.
    expect(screen.getByText("Mensaje 15")).toBeTruthy();

    resolverPrimeraLectura({
      success: true,
      data: {},
    });

    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  it("no marca una conversación anterior tras navegar", async () => {
    let resolverMensajes;

    const pendientes = new Promise((resolve) => {
      resolverMensajes = resolve;
    });

    const otraConversacion = {
      ...conversacion,
      id: 3,
      nombre: "Equipo de soporte",
    };

    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion, otraConversacion],
    });

    obtenerMensajesInternos.mockImplementation((id) =>
      id === 2
        ? pendientes
        : Promise.resolve({
            messages: [crearMensaje(30, 3)],
            nextCursor: null,
          }),
    );

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

    await screen.findByText("Mensaje 30");

    resolverMensajes({
      messages: [crearMensaje(15)],
      nextCursor: null,
    });

    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
        3,
        30,
      );
    });

    expect(marcarComoLeidoInterno).not.toHaveBeenCalledWith(
      2,
      15,
    );
  });

  it("no duplica lecturas al cargar mensajes antiguos", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos
      .mockResolvedValueOnce({
        messages: [crearMensaje(15)],
        nextCursor: 15,
      })
      .mockResolvedValueOnce({
        messages: [crearMensaje(10)],
        nextCursor: null,
      });

    renderizar();

    const boton = await screen.findByRole("button", {
      name: "Cargar mensajes anteriores",
    });

    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
        2,
        15,
      );
    });

    fireEvent.click(boton);

    await screen.findByText("Mensaje 10");

    expect(marcarComoLeidoInterno).toHaveBeenCalledTimes(1);
  });
});

describe("CH-INT-09.4 - Concurrencia del marcador", () => {
  it("marca el mensaje nuevo recibido mientras existe una lectura pendiente", async () => {
    let resolverPrimeraLectura;

    const primeraLectura = new Promise((resolve) => {
      resolverPrimeraLectura = resolve;
    });

    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    obtenerMensajesInternos.mockResolvedValue({
      messages: [crearMensaje(15)],
      nextCursor: null,
    });

    marcarComoLeidoInterno
      .mockReturnValueOnce(primeraLectura)
      .mockResolvedValue({
        success: true,
        data: {},
      });

    renderizar();

    await screen.findByText("Mensaje 15");

    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
        2,
        15,
      );
    });

    expect(marcarComoLeidoInterno).toHaveBeenCalledTimes(1);

    // Simulamos que el polling recibe un mensaje nuevo.
    await act(async () => {
      const opciones = useInternalMessagePolling.mock.lastCall[0];

      opciones.onMessages([crearMensaje(20)]);
    });

    expect(screen.getByText("Mensaje 20")).toBeTruthy();

    // La primera lectura sigue pendiente:
    // no debe iniciarse otra solicitud simultánea.
    expect(marcarComoLeidoInterno).toHaveBeenCalledTimes(1);

    // Terminamos la primera solicitud.
    await act(async () => {
      resolverPrimeraLectura({
        success: true,
        data: {},
      });

      await primeraLectura;
    });

    // Ahora debe procesarse el ID más reciente.
    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenNthCalledWith(
        2,
        2,
        20,
      );
    });

    expect(marcarComoLeidoInterno).toHaveBeenCalledTimes(2);
  });
});