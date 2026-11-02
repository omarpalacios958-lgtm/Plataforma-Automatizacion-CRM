// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ChatCommercialInbox from "../src/modules/chat/ChatCommercialInbox.jsx";

import {
  listarConversacionesComerciales,
  listarMisConversacionesComerciales,
} from "../src/services/chat-commercial.service.js";

vi.mock("../src/services/chat-commercial.service.js", () => ({
  listarConversacionesComerciales: vi.fn(),
  listarMisConversacionesComerciales: vi.fn(),
}));

const conversacion = {
  id: 24,
  tipo: "COMERCIAL",
  estado: "PENDIENTE",
  nombre: null,
  assignedAgentId: null,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

function respuesta(conversations = [], nextCursor = null) {
  return { conversations, nextCursor };
}

function renderizarBandeja() {
  return render(
    <MemoryRouter>
      <ChatCommercialInbox />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();

  listarConversacionesComerciales.mockResolvedValue(
    respuesta([conversacion]),
  );

  listarMisConversacionesComerciales.mockResolvedValue(
    respuesta([]),
  );
});

describe("ChatCommercialInbox - bandeja comercial", () => {
  it("carga las conversaciones generales inicialmente", async () => {
    renderizarBandeja();

    expect(
      screen.getByText("Cargando conversaciones..."),
    ).toBeTruthy();

    expect(
      await screen.findByText("Conversación #24"),
    ).toBeTruthy();

    expect(listarConversacionesComerciales).toHaveBeenCalledWith({
      limit: 20,
    });
  });

  it("permite consultar las conversaciones propias", async () => {
    renderizarBandeja();

    await screen.findByText("Conversación #24");

    fireEvent.change(screen.getByLabelText("Bandeja"), {
      target: { value: "mias" },
    });

    await waitFor(() => {
      expect(listarMisConversacionesComerciales).toHaveBeenCalledWith({
        limit: 20,
      });
    });

    expect(
      await screen.findByText(
        "No hay conversaciones para los filtros seleccionados.",
      ),
    ).toBeTruthy();
  });

  it("filtra por estado permitido", async () => {
    renderizarBandeja();

    await screen.findByText("Conversación #24");

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "PENDIENTE" },
    });

    await waitFor(() => {
      expect(listarConversacionesComerciales).toHaveBeenCalledWith({
        limit: 20,
        estado: "PENDIENTE",
      });
    });
  });

  it("avanza utilizando el cursor del servidor", async () => {
    listarConversacionesComerciales
      .mockResolvedValueOnce(respuesta([conversacion], 24))
      .mockResolvedValueOnce(
        respuesta([{ ...conversacion, id: 23 }]),
      );

    renderizarBandeja();

    await screen.findByText("Conversación #24");

    fireEvent.click(
      screen.getByRole("button", { name: "Siguiente" }),
    );

    expect(
      await screen.findByText("Conversación #23"),
    ).toBeTruthy();

    expect(listarConversacionesComerciales).toHaveBeenCalledWith({
      limit: 20,
      cursor: 24,
    });
  });

  it("permite regresar a la página anterior", async () => {
    listarConversacionesComerciales
      .mockResolvedValueOnce(respuesta([conversacion], 24))
      .mockResolvedValueOnce(
        respuesta([{ ...conversacion, id: 23 }]),
      )
      .mockResolvedValueOnce(respuesta([conversacion], 24));

    renderizarBandeja();

    await screen.findByText("Conversación #24");

    fireEvent.click(
      screen.getByRole("button", { name: "Siguiente" }),
    );

    await screen.findByText("Conversación #23");

    fireEvent.click(
      screen.getByRole("button", { name: "Anterior" }),
    );

    expect(
      await screen.findByText("Conversación #24"),
    ).toBeTruthy();
  });

  it("muestra errores de consulta", async () => {
    listarConversacionesComerciales.mockRejectedValueOnce(
      new Error("Acceso denegado"),
    );

    renderizarBandeja();

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain("Acceso denegado");
  });

  it("permite actualizar la bandeja", async () => {
    renderizarBandeja();

    await screen.findByText("Conversación #24");

    fireEvent.click(
      screen.getByRole("button", { name: "Actualizar" }),
    );

    await waitFor(() => {
      expect(listarConversacionesComerciales).toHaveBeenCalledTimes(2);
    });
  });

  it("ignora respuestas antiguas después de cambiar de vista", async () => {
    let resolverPrimera;

    listarConversacionesComerciales.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolverPrimera = resolve;
        }),
    );

    renderizarBandeja();

    fireEvent.change(screen.getByLabelText("Bandeja"), {
      target: { value: "mias" },
    });

    expect(
      await screen.findByText(
        "No hay conversaciones para los filtros seleccionados.",
      ),
    ).toBeTruthy();

    resolverPrimera(respuesta([conversacion]));

    await waitFor(() => {
      expect(screen.queryByText("Conversación #24")).toBeNull();
    });
  });
});