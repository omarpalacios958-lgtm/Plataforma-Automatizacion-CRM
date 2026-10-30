
/* @vitest-environment jsdom */

import { StrictMode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import ChatVisitor from "../src/modules/chat/ChatVisitor.jsx";

import {
  abrirConversacionVisitante,
  consultarSesionVisitante,
  crearSesionVisitante,
  eliminarTokenVisitante,
  listarConversacionesVisitante,
  obtenerTokenVisitante,
} from "../src/services/chat-visitor.service.js";

vi.mock("../src/services/chat-visitor.service.js", () => ({
  abrirConversacionVisitante: vi.fn(),
  consultarSesionVisitante: vi.fn(),
  crearSesionVisitante: vi.fn(),
  eliminarTokenVisitante: vi.fn(),
  listarConversacionesVisitante: vi.fn(),
  obtenerTokenVisitante: vi.fn(),
}));

function crearPromesaPendiente() {
  let resolver;

  const promesa = new Promise((resolve) => {
    resolver = resolve;
  });

  return { promesa, resolver };
}

beforeEach(() => {
  vi.clearAllMocks();
  obtenerTokenVisitante.mockReturnValue(null);
  listarConversacionesVisitante.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe("ChatVisitor - recuperación de sesión", () => {
  it("muestra bienvenida cuando no existe token", async () => {
    render(<ChatVisitor />);

    expect(
      await screen.findByText("Bienvenido"),
    ).toBeTruthy();

    expect(consultarSesionVisitante).not.toHaveBeenCalled();
    expect(eliminarTokenVisitante).not.toHaveBeenCalled();
  });

  it("recupera una sesión válida", async () => {
    obtenerTokenVisitante.mockReturnValue("token-valido");

    consultarSesionVisitante.mockResolvedValue({
      visitor: {
        id: 10,
        nombre: "Ana",
      },
      expiresAt: "2026-10-30T12:00:00.000Z",
    });

    render(<ChatVisitor />);

    expect(
      await screen.findByText("Hola, Ana"),
    ).toBeTruthy();

    expect(consultarSesionVisitante).toHaveBeenCalledTimes(1);
    expect(eliminarTokenVisitante).not.toHaveBeenCalled();
  });

  it("elimina el token cuando el backend responde 401", async () => {
    obtenerTokenVisitante.mockReturnValue("token-expirado");

    consultarSesionVisitante.mockRejectedValue(
      Object.assign(new Error("No autorizado"), {
        status: 401,
      }),
    );

    render(<ChatVisitor />);

    expect(
      await screen.findByText("Bienvenido"),
    ).toBeTruthy();

    expect(eliminarTokenVisitante).toHaveBeenCalledTimes(1);
  });

  it("conserva el token ante un error de conexión", async () => {
    obtenerTokenVisitante.mockReturnValue("token-existente");

    consultarSesionVisitante.mockRejectedValue(
      new Error("Error de red"),
    );

    render(<ChatVisitor />);

    expect(
      await screen.findByText("No se pudo conectar"),
    ).toBeTruthy();

    expect(
      screen.getByRole("button", { name: "Reintentar" }),
    ).toBeTruthy();

    expect(eliminarTokenVisitante).not.toHaveBeenCalled();
  });

  it("permite reintentar después de un error", async () => {
    obtenerTokenVisitante.mockReturnValue("token-existente");

    consultarSesionVisitante
      .mockRejectedValueOnce(new Error("Error de red"))
      .mockResolvedValueOnce({
        visitor: {
          id: 11,
          nombre: "Carlos",
        },
        expiresAt: "2026-10-30T12:00:00.000Z",
      });

    render(<ChatVisitor />);

    const boton = await screen.findByRole("button", {
      name: "Reintentar",
    });

    fireEvent.click(boton);

    expect(
      await screen.findByText("Hola, Carlos"),
    ).toBeTruthy();

    expect(consultarSesionVisitante).toHaveBeenCalledTimes(2);
    expect(eliminarTokenVisitante).not.toHaveBeenCalled();
  });

  it("ignora una respuesta obsoleta bajo StrictMode", async () => {
    obtenerTokenVisitante.mockReturnValue("token-existente");

    const solicitudAnterior = crearPromesaPendiente();

    consultarSesionVisitante
      .mockReturnValueOnce(solicitudAnterior.promesa)
      .mockResolvedValueOnce({
        visitor: {
          nombre: "Sesión vigente",
        },
      });

    render(
      <StrictMode>
        <ChatVisitor />
      </StrictMode>,
    );

    expect(
      await screen.findByText("Hola, Sesión vigente"),
    ).toBeTruthy();

    solicitudAnterior.resolver({
      visitor: {
        nombre: "Sesión obsoleta",
      },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Hola, Sesión obsoleta"),
      ).toBeNull();

      expect(
        screen.getByText("Hola, Sesión vigente"),
      ).toBeTruthy();
    });
  });

  it("descarta resultados al desmontarse", async () => {
    obtenerTokenVisitante.mockReturnValue("token-existente");

    const solicitud = crearPromesaPendiente();

    consultarSesionVisitante.mockReturnValue(solicitud.promesa);

    const { unmount } = render(<ChatVisitor />);

    expect(
      screen.getByText("Verificando tu sesión..."),
    ).toBeTruthy();

    unmount();

    solicitud.resolver({
      visitor: {
        nombre: "Visitante",
      },
    });

    await Promise.resolve();

    expect(eliminarTokenVisitante).not.toHaveBeenCalled();
  });

  it("funciona bajo StrictMode", async () => {
    obtenerTokenVisitante.mockReturnValue("token-existente");

    consultarSesionVisitante.mockResolvedValue({
      visitor: {
        nombre: "Laura",
      },
    });

    render(
      <StrictMode>
        <ChatVisitor />
      </StrictMode>,
    );

    expect(
      await screen.findByText("Hola, Laura"),
    ).toBeTruthy();

    expect(eliminarTokenVisitante).not.toHaveBeenCalled();
  });
});

describe("ChatVisitor - creación de sesión", () => {
  it("crea una sesión con nombre y correo opcional", async () => {
    crearSesionVisitante.mockResolvedValue({
      visitor: { id: 20, nombre: "Ana", correo: null },
      token: "a".repeat(43),
      expiresAt: "2026-10-30T12:00:00.000Z",
    });

    render(<ChatVisitor />);

    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "  Ana  " },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continuar como visitante",
      }),
    );

    expect(await screen.findByText("Hola, Ana")).toBeTruthy();

    expect(crearSesionVisitante).toHaveBeenCalledWith({
      nombre: "Ana",
      correo: null,
    });
  });

  it("normaliza el correo antes de crear la sesión", async () => {
    crearSesionVisitante.mockResolvedValue({
      visitor: {
        id: 21,
        nombre: "Carlos",
        correo: "carlos@ejemplo.com",
      },
      token: "b".repeat(43),
      expiresAt: "2026-10-30T12:00:00.000Z",
    });

    render(<ChatVisitor />);

    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "Carlos" },
    });

    fireEvent.change(
      screen.getByLabelText("Correo electrónico (opcional)"),
      {
        target: { value: " CARLOS@EJEMPLO.COM " },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continuar como visitante",
      }),
    );

    expect(await screen.findByText("Hola, Carlos")).toBeTruthy();

    expect(crearSesionVisitante).toHaveBeenCalledWith({
      nombre: "Carlos",
      correo: "carlos@ejemplo.com",
    });
  });

  it("rechaza nombres inválidos sin llamar al backend", async () => {
    render(<ChatVisitor />);

    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "A" },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continuar como visitante",
      }),
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(crearSesionVisitante).not.toHaveBeenCalled();
  });

  it("rechaza correos inválidos sin llamar al backend", async () => {
    render(<ChatVisitor />);

    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "María" },
    });

    fireEvent.change(
      screen.getByLabelText("Correo electrónico (opcional)"),
      {
        target: { value: "correo-invalido" },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continuar como visitante",
      }),
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(crearSesionVisitante).not.toHaveBeenCalled();
  });

  it("muestra errores del servidor y conserva los datos", async () => {
    crearSesionVisitante.mockRejectedValue(
      Object.assign(new Error("No fue posible crear la sesión."), {
        status: 500,
      }),
    );

    render(<ChatVisitor />);

    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "Lucía" },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continuar como visitante",
      }),
    );

    expect(
      await screen.findByText("No fue posible crear la sesión."),
    ).toBeTruthy();

    expect(screen.getByLabelText("Nombre *").value).toBe("Lucía");

    expect(
      screen.getByRole("button", {
        name: "Continuar como visitante",
      }).disabled,
    ).toBe(false);
  });
});
describe("ChatVisitor - conversaciones comerciales", () => {
  const sesion = {
    visitor: { id: 30, nombre: "Visitante Prueba" },
    expiresAt: "2026-10-30T12:00:00.000Z",
  };

  // ... tus pruebas existentes ...

  it("descarta la apertura si el componente se desmonta", async () => {
    const solicitud = crearPromesaPendiente();

    listarConversacionesVisitante.mockResolvedValue([]);
    abrirConversacionVisitante.mockReturnValue(solicitud.promesa);

    const { unmount } = render(<ChatVisitor />);

    const boton = await screen.findByRole("button", {
      name: "Iniciar conversación",
    });

    fireEvent.click(boton);

    expect(abrirConversacionVisitante).toHaveBeenCalledTimes(1);

    unmount();

    solicitud.resolver({
      success: true,
      creada: true,
      data: {
        id: 49,
        tipo: "COMERCIAL",
        estado: "PENDIENTE",
      },
    });

    await Promise.resolve();

    expect(listarConversacionesVisitante).toHaveBeenCalledTimes(1);
  });

  it("regresa al formulario cuando vence la sesión al consultar conversaciones", async () => {
  listarConversacionesVisitante.mockRejectedValueOnce(
    Object.assign(new Error("Sesión vencida"), {
      status: 401,
    }),
  );

  render(<ChatVisitor />);

  expect(
    await screen.findByText("Bienvenido"),
  ).toBeTruthy();

  expect(eliminarTokenVisitante).toHaveBeenCalledTimes(1);

  expect(
    screen.getByRole("button", {
      name: "Continuar como visitante",
    }),
  ).toBeTruthy();

  expect(abrirConversacionVisitante).not.toHaveBeenCalled();
});

  beforeEach(() => {
    obtenerTokenVisitante.mockReturnValue("token-valido");
    consultarSesionVisitante.mockResolvedValue(sesion);
  });

  it("muestra la opción de iniciar conversación cuando no existe ninguna", async () => {
    listarConversacionesVisitante.mockResolvedValue([]);

    render(<ChatVisitor />);

    expect(
      await screen.findByRole("button", {
        name: "Iniciar conversación",
      }),
    ).toBeTruthy();

    expect(abrirConversacionVisitante).not.toHaveBeenCalled();
  });

  it("recupera una conversación existente sin crear otra", async () => {
    listarConversacionesVisitante.mockResolvedValue([
      {
        id: 45,
        tipo: "COMERCIAL",
        estado: "PENDIENTE",
      },
    ]);

    render(<ChatVisitor />);

    expect(
      await screen.findByText("Número de conversación: 45"),
    ).toBeTruthy();

    expect(screen.getByText("Estado: PENDIENTE")).toBeTruthy();
    expect(abrirConversacionVisitante).not.toHaveBeenCalled();
  });

  it("abre una conversación al solicitarla", async () => {
    listarConversacionesVisitante.mockResolvedValue([]);

    abrirConversacionVisitante.mockResolvedValue({
      success: true,
      creada: true,
      data: {
        id: 46,
        tipo: "COMERCIAL",
        estado: "PENDIENTE",
      },
    });

    render(<ChatVisitor />);

    const boton = await screen.findByRole("button", {
      name: "Iniciar conversación",
    });

    fireEvent.click(boton);

    expect(
      await screen.findByText("Número de conversación: 46"),
    ).toBeTruthy();

    expect(abrirConversacionVisitante).toHaveBeenCalledTimes(1);
  });

  it("recupera una conversación creada cuando se pierde la respuesta", async () => {
    const conversacion = {
      id: 48,
      tipo: "COMERCIAL",
      estado: "PENDIENTE",
    };

    listarConversacionesVisitante
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([conversacion]);

    abrirConversacionVisitante.mockRejectedValueOnce(
      new Error("La conexión se interrumpió"),
    );

    render(<ChatVisitor />);

    const boton = await screen.findByRole("button", {
      name: "Iniciar conversación",
    });

    fireEvent.click(boton);

    expect(
      await screen.findByText("Número de conversación: 48"),
    ).toBeTruthy();

    expect(abrirConversacionVisitante).toHaveBeenCalledTimes(1);
    expect(listarConversacionesVisitante).toHaveBeenCalledTimes(2);
  });

  it("permite reintentar cuando falla la consulta", async () => {
    listarConversacionesVisitante
      .mockRejectedValueOnce(new Error("Error de red"))
      .mockResolvedValueOnce([]);

    render(<ChatVisitor />);

    const boton = await screen.findByRole("button", {
      name: "Reintentar consulta",
    });

    fireEvent.click(boton);

    expect(
      await screen.findByRole("button", {
        name: "Iniciar conversación",
      }),
    ).toBeTruthy();

    expect(listarConversacionesVisitante).toHaveBeenCalledTimes(2);
  });

  it("evita solicitudes duplicadas al iniciar conversación", async () => {
    listarConversacionesVisitante.mockResolvedValue([]);

    let resolver;

    abrirConversacionVisitante.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    render(<ChatVisitor />);

    const boton = await screen.findByRole("button", {
      name: "Iniciar conversación",
    });

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(abrirConversacionVisitante).toHaveBeenCalledTimes(1);

    resolver({
      success: true,
      creada: true,
      data: {
        id: 47,
        tipo: "COMERCIAL",
        estado: "PENDIENTE",
      },
    });

    expect(
      await screen.findByText("Número de conversación: 47"),
    ).toBeTruthy();
  });
});
