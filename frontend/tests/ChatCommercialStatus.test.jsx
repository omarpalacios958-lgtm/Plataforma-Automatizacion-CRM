
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
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import ChatCommercialStatus from "../src/modules/chat/ChatCommercialStatus.jsx";

import {
  cambiarEstadoConversacionComercial,
} from "../src/services/chat-commercial.service.js";

vi.mock("../src/services/chat-commercial.service.js", () => ({
  cambiarEstadoConversacionComercial: vi.fn(),
}));

const conversacionBase = {
  id: 24,
  tipo: "COMERCIAL",
  estado: "ASIGNADA",
  assignedAgentId: 5,
};

let onEstadoActualizado;
let onConflicto;

function renderizarEstado(cambios = {}) {
  return render(
    <ChatCommercialStatus
      conversacion={{
        ...conversacionBase,
        ...cambios,
      }}
      onEstadoActualizado={onEstadoActualizado}
      onConflicto={onConflicto}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  onEstadoActualizado = vi.fn();
  onConflicto = vi.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("ChatCommercialStatus", () => {
  it("permite iniciar una conversación asignada", async () => {
    cambiarEstadoConversacionComercial.mockResolvedValue({
      ...conversacionBase,
      estado: "EN_CURSO",
    });

    renderizarEstado();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Iniciar atención",
      }),
    );

    await waitFor(() => {
      expect(
        cambiarEstadoConversacionComercial,
      ).toHaveBeenCalledWith(24, "EN_CURSO");

      expect(onEstadoActualizado).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 24,
          estado: "EN_CURSO",
        }),
      );
    });
  });

  it("permite resolver una conversación en curso", async () => {
    cambiarEstadoConversacionComercial.mockResolvedValue({
      ...conversacionBase,
      estado: "RESUELTA",
    });

    renderizarEstado({
      estado: "EN_CURSO",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Resolver conversación",
      }),
    );

    await waitFor(() => {
      expect(
        cambiarEstadoConversacionComercial,
      ).toHaveBeenCalledWith(24, "RESUELTA");
    });
  });

  it("no muestra acciones para conversaciones pendientes", () => {
    renderizarEstado({
      estado: "PENDIENTE",
    });

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("no muestra acciones para conversaciones resueltas", () => {
    renderizarEstado({
      estado: "RESUELTA",
    });

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("evita solicitudes duplicadas", async () => {
    let resolver;

    cambiarEstadoConversacionComercial.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );

    renderizarEstado();

    const boton = screen.getByRole("button", {
      name: "Iniciar atención",
    });

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(
      cambiarEstadoConversacionComercial,
    ).toHaveBeenCalledTimes(1);

    resolver({
      ...conversacionBase,
      estado: "EN_CURSO",
    });

    await waitFor(() => {
      expect(onEstadoActualizado).toHaveBeenCalledTimes(1);
    });
  });

  it("actualiza la conversación cuando ocurre un conflicto 409", async () => {
    cambiarEstadoConversacionComercial.mockRejectedValue({
      status: 409,
      message: "Conflicto",
    });

    renderizarEstado();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Iniciar atención",
      }),
    );

    await waitFor(() => {
      expect(onConflicto).toHaveBeenCalledWith(24);
    });

    expect(onEstadoActualizado).not.toHaveBeenCalled();
  });

  it("muestra errores de autorización sin cambiar el estado", async () => {
    cambiarEstadoConversacionComercial.mockRejectedValue({
      status: 404,
      message: "Conversación no encontrada o no autorizada.",
    });

    renderizarEstado();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Iniciar atención",
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toBeTruthy();

    expect(onEstadoActualizado).not.toHaveBeenCalled();
  });

  it("rechaza respuestas inconsistentes del servidor", async () => {
    cambiarEstadoConversacionComercial.mockResolvedValue({
      ...conversacionBase,
      id: 25,
      estado: "EN_CURSO",
    });

    renderizarEstado();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Iniciar atención",
      }),
    );

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain(
      "La respuesta del cambio de estado no es válida.",
    );

    expect(onEstadoActualizado).not.toHaveBeenCalled();
  });
});
