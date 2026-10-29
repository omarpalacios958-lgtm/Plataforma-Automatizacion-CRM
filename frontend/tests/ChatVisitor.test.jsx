
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
  consultarSesionVisitante,
  eliminarTokenVisitante,
  obtenerTokenVisitante,
} from "../src/services/chat-visitor.service.js";

vi.mock("../src/services/chat-visitor.service.js", () => ({
  consultarSesionVisitante: vi.fn(),
  eliminarTokenVisitante: vi.fn(),
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
