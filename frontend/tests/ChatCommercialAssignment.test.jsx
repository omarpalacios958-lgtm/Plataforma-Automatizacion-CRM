
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

import ChatCommercialAssignment from "../src/modules/chat/ChatCommercialAssignment.jsx";

import { asignarConversacionComercial } from "../src/services/chat-commercial.service.js";

vi.mock("../src/services/chat-commercial.service.js", () => ({
  asignarConversacionComercial: vi.fn(),
}));

const pendiente = {
  id: 3,
  tipo: "COMERCIAL",
  estado: "PENDIENTE",
  assignedAgentId: null,
};

const asignada = {
  ...pendiente,
  estado: "ASIGNADA",
  assignedAgentId: 7,
};

function preparar(props = {}) {
  const onAsignada = vi.fn();
  const onConflicto = vi.fn().mockResolvedValue(undefined);

  const vista = render(
    <ChatCommercialAssignment
      conversacion={pendiente}
      onAsignada={onAsignada}
      onConflicto={onConflicto}
      {...props}
    />,
  );

  return { vista, onAsignada, onConflicto };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ChatCommercialAssignment", () => {
  it("muestra el botón para una conversación pendiente", () => {
    preparar();

    expect(
      screen.getByRole("button", {
        name: "Asignarme conversación",
      }),
    ).toBeTruthy();
  });

  it("no permite asignar conversaciones que no están pendientes", () => {
    preparar({
      conversacion: asignada,
    });

    expect(
      screen.queryByRole("button"),
    ).toBeNull();
  });

  it("no permite asignar una conversación con agente", () => {
    preparar({
      conversacion: {
        ...pendiente,
        assignedAgentId: 9,
      },
    });

    expect(
      screen.queryByRole("button"),
    ).toBeNull();
  });

  it("asigna correctamente y comunica el resultado", async () => {
    asignarConversacionComercial.mockResolvedValue(
      asignada,
    );

    const { onAsignada } = preparar();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Asignarme conversación",
      }),
    );

    await waitFor(() => {
      expect(onAsignada).toHaveBeenCalledWith(asignada);
    });

    expect(
      asignarConversacionComercial,
    ).toHaveBeenCalledWith(3);
  });

  it("evita solicitudes duplicadas", async () => {
    let resolver;

    asignarConversacionComercial.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );

    const { onAsignada } = preparar();

    const boton = screen.getByRole("button", {
      name: "Asignarme conversación",
    });

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(
      asignarConversacionComercial,
    ).toHaveBeenCalledTimes(1);

    expect(boton.disabled).toBe(true);

    await act(async () => {
      resolver(asignada);
    });

    expect(onAsignada).toHaveBeenCalledTimes(1);
  });

  it("muestra errores y permite reintentar", async () => {
    asignarConversacionComercial
      .mockRejectedValueOnce(
        new Error("Error de conexión"),
      )
      .mockResolvedValueOnce(asignada);

    const { onAsignada } = preparar();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Asignarme conversación",
      }),
    );

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain("Error de conexión");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Asignarme conversación",
      }),
    );

    await waitFor(() => {
      expect(onAsignada).toHaveBeenCalledWith(asignada);
    });

    expect(
      asignarConversacionComercial,
    ).toHaveBeenCalledTimes(2);
  });

  it("maneja un conflicto 409 actualizando el detalle", async () => {
    asignarConversacionComercial.mockRejectedValue({
      status: 409,
      message: "Conflicto",
    });

    const { onAsignada, onConflicto } = preparar();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Asignarme conversación",
      }),
    );

    await waitFor(() => {
      expect(onConflicto).toHaveBeenCalledWith(3);
    });

    expect(onAsignada).not.toHaveBeenCalled();
  });

  it("informa si falla la actualización posterior al conflicto", async () => {
    asignarConversacionComercial.mockRejectedValue({
      status: 409,
    });

    const onConflicto = vi.fn().mockRejectedValue(
      new Error("No disponible"),
    );

    preparar({ onConflicto });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Asignarme conversación",
      }),
    );

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain("No fue posible actualizarla");
  });

  it("rechaza respuestas inválidas del servidor", async () => {
    asignarConversacionComercial.mockResolvedValue({
      ...asignada,
      assignedAgentId: null,
    });

    const { onAsignada } = preparar();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Asignarme conversación",
      }),
    );

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain(
      "La respuesta de asignación no es válida.",
    );

    expect(onAsignada).not.toHaveBeenCalled();
  });

  it("ignora respuestas después de desmontar el componente", async () => {
    let resolver;

    asignarConversacionComercial.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );

    const { vista, onAsignada } = preparar();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Asignarme conversación",
      }),
    );

    vista.unmount();

    await act(async () => {
      resolver(asignada);
    });

    expect(onAsignada).not.toHaveBeenCalled();
  });
});
