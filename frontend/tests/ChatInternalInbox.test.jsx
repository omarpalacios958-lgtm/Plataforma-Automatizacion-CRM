// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../src/services/chat-internal.service.js", () => ({
  listarConversacionesInternas: vi.fn(),
}));

import { listarConversacionesInternas } from "../src/services/chat-internal.service.js";
import ChatInternalInbox from "../src/modules/chat/ChatInternalInbox.jsx";

function renderizarBandeja() {
  return render(
    <MemoryRouter>
      <ChatInternalInbox />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CH-05.3.1 - Bandeja de chat interno", () => {
  it("muestra conversaciones privadas y grupales", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [
        {
          id: 1,
          tipo: "INTERNO_PRIVADO",
          estado: "EN_CURSO",
          nombre: null,
          updatedAt: "2026-10-27T21:15:28.743Z",
          participants: [
            {
              userId: 1,
              user: {
                nombre: "Administrador",
                apellido: "General",
              },
            },
            {
              userId: 2,
              user: {
                nombre: "Juan",
                apellido: "Pérez",
              },
            },
          ],
        },
        {
          id: 2,
          tipo: "INTERNO_GRUPAL",
          estado: "EN_CURSO",
          nombre: "Equipo comercial CRM",
          updatedAt: "2026-10-27T22:10:17.611Z",
          participants: [],
        },
      ],
    });

    renderizarBandeja();

    expect(
      screen.getByRole("status"),
    ).toBeTruthy();

    expect(
      await screen.findByText("Equipo comercial CRM"),
    ).toBeTruthy();

    expect(
      screen.getByText("Administrador General / Juan Pérez"),
    ).toBeTruthy();

    expect(screen.getByText("Privada")).toBeTruthy();
    expect(screen.getByText("Grupal")).toBeTruthy();
  });

  it("muestra un mensaje cuando la bandeja está vacía", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [],
    });

    renderizarBandeja();

    expect(
      await screen.findByText(
        "No tienes conversaciones internas disponibles.",
      ),
    ).toBeTruthy();
  });

  it("muestra errores del servicio", async () => {
    listarConversacionesInternas.mockRejectedValue(
      new Error("Acceso denegado."),
    );

    renderizarBandeja();

    await waitFor(() => {
      expect(
        screen.getByRole("alert").textContent,
      ).toBe("Acceso denegado.");
    });
  });

  it("rechaza respuestas con formato incorrecto", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: null,
    });

    renderizarBandeja();

    expect(
      await screen.findByRole("alert"),
    ).toHaveProperty(
      "textContent",
      "Respuesta de conversaciones internas no válida.",
    );
  });

  it("permite navegar al detalle de una conversación", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [
        {
          id: 2,
          tipo: "INTERNO_GRUPAL",
          estado: "EN_CURSO",
          nombre: "Equipo comercial CRM",
          updatedAt: "2026-10-27T22:10:17.611Z",
          participants: [],
        },
      ],
    });

    renderizarBandeja();

    const enlace = await screen.findByRole("link", {
      name: "Ver mensajes",
    });

    expect(enlace.getAttribute("href")).toBe("/chat/interno/2");
  });
});