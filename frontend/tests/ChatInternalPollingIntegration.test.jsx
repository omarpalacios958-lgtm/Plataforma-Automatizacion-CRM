
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
  marcarComoLeidoInterno: vi.fn(),
}));

import {
  listarConversacionesInternas,
  marcarComoLeidoInterno,
  obtenerMensajesInternos,
} from "../src/services/chat-internal.service.js";

import ChatInternalDetail from "../src/modules/chat/ChatInternalDetail.jsx";

const conversaciones = [
  {
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
  },
  {
    id: 3,
    tipo: "INTERNO_GRUPAL",
    estado: "EN_CURSO",
    nombre: "Equipo de soporte",
    participants: [
      {
        id: 8,
        userId: 4,
        user: {
          nombre: "Ana",
          apellido: "López",
        },
      },
    ],
  },
];

function mensaje(id, conversationId, contenido) {
  return {
    id,
    conversationId,
    participantId: conversationId === 2 ? 7 : 8,
    contenido,
    createdAt: "2026-11-03T10:00:00.000Z",
    editedAt: null,
    deletedAt: null,
  };
}

function crearDiferida() {
  let resolver;

  const promise = new Promise((resolve) => {
    resolver = resolve;
  });

  return { promise, resolver };
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

function renderizar() {
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
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("CH-05.6.1 - Integración del polling interno", () => {
  it("descarta el polling anterior al cambiar de conversación", async () => {
    const consultaPendiente = crearDiferida();

    listarConversacionesInternas.mockResolvedValue({
      conversations: conversaciones,
    });

    obtenerMensajesInternos.mockImplementation(
      (conversationId, opciones) => {
        if (conversationId === 2 && opciones.afterId === 15) {
          return consultaPendiente.promise;
        }

        if (conversationId === 2) {
          return Promise.resolve({
            messages: [
              mensaje(15, 2, "Mensaje comercial inicial"),
            ],
            nextCursor: null,
          });
        }

        if (conversationId === 3 && opciones.afterId === 30) {
          return Promise.resolve({
            messages: [
              mensaje(31, 3, "Respuesta nueva de soporte"),
            ],
            nextCursor: null,
          });
        }

        return Promise.resolve({
          messages: [
            mensaje(30, 3, "Mensaje inicial de soporte"),
          ],
          nextCursor: null,
        });
      },
    );

    renderizar();

    expect(
      await screen.findByText("Mensaje comercial inicial"),
    ).toBeTruthy();

    // Esperar al primer ciclo real de polling.
    await waitFor(
      () => {
        expect(obtenerMensajesInternos).toHaveBeenCalledWith(
          2,
          { limit: 20, afterId: 15 },
        );
      },
      { timeout: 7000 },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cambiar conversación",
      }),
    );

    expect(
      await screen.findByText("Mensaje inicial de soporte"),
    ).toBeTruthy();

    // La respuesta antigua llega después del cambio de ruta.
    await act(async () => {
      consultaPendiente.resolver({
        messages: [
          mensaje(16, 2, "Respuesta obsoleta comercial"),
        ],
        nextCursor: null,
      });

      await consultaPendiente.promise;
    });

    expect(
      screen.queryByText("Respuesta obsoleta comercial"),
    ).toBeNull();

    expect(
      screen.getByText("Mensaje inicial de soporte"),
    ).toBeTruthy();

    // El siguiente ciclo debe consultar la conversación 3.
    await waitFor(
      () => {
        expect(obtenerMensajesInternos).toHaveBeenCalledWith(
          3,
          { limit: 20, afterId: 30 },
        );
      },
      { timeout: 7000 },
    );

    expect(
      await screen.findByText("Respuesta nueva de soporte"),
    ).toBeTruthy();

    expect(
      screen.queryByText("Respuesta obsoleta comercial"),
    ).toBeNull();
  }, 20000);
});


describe("CH-INT-09.4.2 - Lectura mediante polling real", () => {
  it("marca como leído un mensaje recibido mediante polling sin recargar", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: conversaciones,
    });

    obtenerMensajesInternos.mockImplementation(
      (conversationId, opciones) => {
        if (
          conversationId === 2 &&
          opciones.afterId === 15
        ) {
          return Promise.resolve({
            messages: [
              mensaje(20, 2, "Mensaje recibido por polling"),
            ],
            nextCursor: null,
          });
        }

        return Promise.resolve({
          messages: [
            mensaje(15, 2, "Mensaje inicial"),
          ],
          nextCursor: null,
        });
      },
    );

    renderizar();

    // Primero se carga el historial inicial.
    expect(
      await screen.findByText("Mensaje inicial"),
    ).toBeTruthy();

    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
        2,
        15,
      );
    });

    // Esperamos el ciclo real de polling (5 segundos).
    await waitFor(
      () => {
        expect(obtenerMensajesInternos).toHaveBeenCalledWith(
          2,
          { limit: 20, afterId: 15 },
        );
      },
      { timeout: 7000 },
    );

    // El mensaje debe aparecer sin recargar la página.
    expect(
      await screen.findByText(
        "Mensaje recibido por polling",
      ),
    ).toBeTruthy();

    // El marcador debe avanzar al nuevo mensaje.
    await waitFor(() => {
      expect(marcarComoLeidoInterno).toHaveBeenCalledWith(
        2,
        20,
      );
    });

    expect(marcarComoLeidoInterno).toHaveBeenNthCalledWith(
      1,
      2,
      15,
    );

    expect(marcarComoLeidoInterno).toHaveBeenNthCalledWith(
      2,
      2,
      20,
    );

    expect(marcarComoLeidoInterno).toHaveBeenCalledTimes(2);
  }, 12000);
});
