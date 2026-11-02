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
  Link,
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import ChatCommercialDetail from "../src/modules/chat/ChatCommercialDetail.jsx";

import { obtenerConversacionComercial } from "../src/services/chat-commercial.service.js";
import { useAuth } from "../src/context/useAuth.js";

vi.mock("../src/services/chat-commercial.service.js", () => ({
  obtenerConversacionComercial: vi.fn(),
}));

vi.mock("../src/context/useAuth.js", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../src/modules/chat/ChatCommercialMessages.jsx", () => ({
  default: ({ conversationId, mensajesEnviados = [] }) => (
    <section aria-label="Historial comercial de prueba">
      <span>Historial #{conversationId}</span>
      {mensajesEnviados.map((mensaje) => (
        <p key={mensaje.id}>{mensaje.contenido}</p>
      ))}
    </section>
  ),
}));

vi.mock("../src/modules/chat/ChatCommercialMessageForm.jsx", () => ({
  default: ({ conversationId, onMensajeEnviado }) => (
    <button
      type="button"
      onClick={() =>
        onMensajeEnviado({
          id: 501,
          conversationId,
          contenido: "Respuesta comercial confirmada",
        })
      }
    >
      Simular respuesta comercial
    </button>
  ),
}));


const conversacion = {
  id: 24,
  tipo: "COMERCIAL",
  estado: "PENDIENTE",
  nombre: null,
  assignedAgentId: null,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  participants: [
    {
      id: 7,
      visitor: {
        id: 3,
        nombre: "Cliente de prueba",
        correo: "cliente@example.com",
      },
    },
  ],
};

function renderizarDetalle(ruta = "/chat/comercial/24") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route
          path="/chat/comercial/:conversationId"
          element={<ChatCommercialDetail />}
        />
        <Route
          path="/chat/comercial"
          element={<p>Bandeja comercial de prueba</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();

  useAuth.mockReturnValue({
    usuario: {
      id: 5,
      nombre: "Agente",
      apellido: "Prueba",
      role: "Vendedor",
    },
  });

  obtenerConversacionComercial.mockResolvedValue(
    conversacion,
  );
});

describe("ChatCommercialDetail - detalle comercial", () => {

it("permite responder al agente asignado en estado ASIGNADA", async () => {
  obtenerConversacionComercial.mockResolvedValue({
    ...conversacion,
    estado: "ASIGNADA",
    assignedAgentId: 5,
  });

  renderizarDetalle();

  expect(
    await screen.findByRole("button", {
      name: "Simular respuesta comercial",
    }),
  ).toBeTruthy();
});

it("permite responder al agente asignado en estado EN_CURSO", async () => {
  obtenerConversacionComercial.mockResolvedValue({
    ...conversacion,
    estado: "EN_CURSO",
    assignedAgentId: 5,
  });

  renderizarDetalle();

  expect(
    await screen.findByRole("button", {
      name: "Simular respuesta comercial",
    }),
  ).toBeTruthy();
});

it("no permite responder cuando la conversación está resuelta", async () => {
  obtenerConversacionComercial.mockResolvedValue({
    ...conversacion,
    estado: "RESUELTA",
    assignedAgentId: 5,
  });

  renderizarDetalle();

  await screen.findByText("RESUELTA");

  expect(
    screen.queryByRole("button", {
      name: "Simular respuesta comercial",
    }),
  ).toBeNull();
});

it("no permite responder a un agente diferente del asignado", async () => {
  useAuth.mockReturnValue({
    usuario: {
      id: 8,
      role: "Vendedor",
    },
  });

  obtenerConversacionComercial.mockResolvedValue({
    ...conversacion,
    estado: "ASIGNADA",
    assignedAgentId: 5,
  });

  renderizarDetalle();

  await screen.findByText("Agente #5");

  expect(
    screen.queryByRole("button", {
      name: "Simular respuesta comercial",
    }),
  ).toBeNull();
});

it("no permite responder a una conversación sin asignar", async () => {
  renderizarDetalle();

  await screen.findByText("Sin asignar");

  expect(
    screen.queryByRole("button", {
      name: "Simular respuesta comercial",
    }),
  ).toBeNull();
});

it("incorpora una respuesta confirmada al historial", async () => {
  obtenerConversacionComercial.mockResolvedValue({
    ...conversacion,
    estado: "EN_CURSO",
    assignedAgentId: 5,
  });

  renderizarDetalle();

  fireEvent.click(
    await screen.findByRole("button", {
      name: "Simular respuesta comercial",
    }),
  );

  expect(
    screen.getByText("Respuesta comercial confirmada"),
  ).toBeTruthy();
});

it("no duplica respuestas confirmadas con el mismo identificador", async () => {
  obtenerConversacionComercial.mockResolvedValue({
    ...conversacion,
    estado: "EN_CURSO",
    assignedAgentId: 5,
  });

  renderizarDetalle();

  const boton = await screen.findByRole("button", {
    name: "Simular respuesta comercial",
  });

  fireEvent.click(boton);
  fireEvent.click(boton);

  expect(
    screen.getAllByText("Respuesta comercial confirmada"),
  ).toHaveLength(1);
});


  it("muestra la acción de estado al agente asignado", async () => {
    obtenerConversacionComercial.mockResolvedValue({
      ...conversacion,
      estado: "ASIGNADA",
      assignedAgentId: 5,
    });

    renderizarDetalle();

    expect(
      await screen.findByRole("button", {
        name: "Iniciar atención",
      }),
    ).toBeTruthy();
  });

  it("oculta la acción de estado a otro agente", async () => {
    useAuth.mockReturnValue({
      usuario: {
        id: 8,
        nombre: "Otro",
        apellido: "Agente",
        role: "Vendedor",
      },
    });

    obtenerConversacionComercial.mockResolvedValue({
      ...conversacion,
      estado: "ASIGNADA",
      assignedAgentId: 5,
    });

    renderizarDetalle();

    expect(
      await screen.findByText("Agente #5"),
    ).toBeTruthy();

    expect(
      screen.queryByRole("button", {
        name: "Iniciar atención",
      }),
    ).toBeNull();
  });

  it("no muestra acciones de estado en conversaciones resueltas", async () => {
    obtenerConversacionComercial.mockResolvedValue({
      ...conversacion,
      estado: "RESUELTA",
      assignedAgentId: 5,
    });

    renderizarDetalle();

    expect(
      await screen.findByText("RESUELTA"),
    ).toBeTruthy();

    expect(
      screen.queryByRole("button", {
        name: "Iniciar atención",
      }),
    ).toBeNull();

    expect(
      screen.queryByRole("button", {
        name: "Resolver conversación",
      }),
    ).toBeNull();
  });

  it("consulta la conversación indicada en la URL", async () => {
    renderizarDetalle();

    expect(
      await screen.findByText("Conversación #24"),
    ).toBeTruthy();

    expect(obtenerConversacionComercial).toHaveBeenCalledWith(
      "24",
    );
  });

  it("muestra estado, agente y visitante", async () => {
    renderizarDetalle();

    expect(
      await screen.findByText("Cliente de prueba"),
    ).toBeTruthy();

    expect(
      screen.getByText("PENDIENTE"),
    ).toBeTruthy();

    expect(
      screen.getByText("Sin asignar"),
    ).toBeTruthy();

    expect(
      screen.getByText("cliente@example.com"),
    ).toBeTruthy();
  });

  it("muestra el agente asignado", async () => {
    obtenerConversacionComercial.mockResolvedValue({
      ...conversacion,
      estado: "ASIGNADA",
      assignedAgentId: 5,
    });

    renderizarDetalle();

    expect(
      await screen.findByText("Agente #5"),
    ).toBeTruthy();
  });

  it("muestra un estado vacío cuando no hay visitantes activos", async () => {
    obtenerConversacionComercial.mockResolvedValue({
      ...conversacion,
      participants: [],
    });

    renderizarDetalle();

    expect(
      await screen.findByText(
        "No hay visitantes activos registrados.",
      ),
    ).toBeTruthy();
  });

  it("rechaza un identificador inválido sin consultar la API", async () => {
    renderizarDetalle("/chat/comercial/invalido");

    expect(
      await screen.findByRole("alert"),
    ).toBeTruthy();

    expect(
      screen.getByRole("alert").textContent,
    ).toContain("Identificador de conversación inválido");

    expect(
      obtenerConversacionComercial,
    ).not.toHaveBeenCalled();
  });

  it("muestra errores de consulta, incluido un 404", async () => {
    obtenerConversacionComercial.mockRejectedValue(
      new Error("Conversación comercial no encontrada."),
    );

    renderizarDetalle();

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain("Conversación comercial no encontrada.");
  });

  it("rechaza una respuesta de detalle inconsistente", async () => {
    obtenerConversacionComercial.mockResolvedValue({
      ...conversacion,
      id: 25,
    });

    renderizarDetalle();

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain(
      "La respuesta del detalle comercial no es válida.",
    );
  });

  it("permite regresar a la bandeja comercial", async () => {
    renderizarDetalle();

    const enlace = screen.getByRole("link", {
      name: "Volver a la bandeja",
    });

    expect(enlace.getAttribute("href")).toBe(
      "/chat/comercial",
    );
  });

  it("ignora respuestas anteriores al cambiar de conversación", async () => {
    let resolverPrimera;

    obtenerConversacionComercial
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolverPrimera = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ...conversacion,
        id: 25,
        nombre: "Conversación actual",
      });

    render(
      <MemoryRouter initialEntries={["/chat/comercial/24"]}>
        <Link to="/chat/comercial/25">
          Cambiar conversación
        </Link>

        <Routes>
          <Route
            path="/chat/comercial/:conversationId"
            element={<ChatCommercialDetail />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        obtenerConversacionComercial,
      ).toHaveBeenCalledWith("24");
    });

    fireEvent.click(
      screen.getByRole("link", {
        name: "Cambiar conversación",
      }),
    );

    expect(
      await screen.findByText("Conversación actual"),
    ).toBeTruthy();

    await act(async () => {
      resolverPrimera(conversacion);
    });

    expect(
      screen.getByText("Conversación actual"),
    ).toBeTruthy();

    expect(
      screen.queryByText("Conversación #24"),
    ).toBeNull();

    expect(
      obtenerConversacionComercial,
    ).toHaveBeenCalledWith("25");
  });
});
