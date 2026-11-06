
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

function crearConversacion(datos = {}) {
  return {
    id: 2,
    tipo: "INTERNO_GRUPAL",
    estado: "EN_CURSO",
    nombre: "Equipo comercial CRM",
    updatedAt: "2026-10-27T22:10:17.611Z",
    unreadCount: 0,
    participants: [],
    ...datos,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CH-05.3.1 - Bandeja de chat interno", () => {
  it("muestra conversaciones privadas y grupales", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [
        crearConversacion({
          id: 1,
          tipo: "INTERNO_PRIVADO",
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
        }),
        crearConversacion(),
      ],
    });

    renderizarBandeja();

    expect(screen.getByRole("status")).toBeTruthy();

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
      conversations: [crearConversacion()],
    });

    renderizarBandeja();

    const enlace = await screen.findByRole("link", {
      name: "Ver mensajes",
    });

    expect(enlace.getAttribute("href")).toBe("/chat/interno/2");
  });

  it("muestra los contadores de mensajes no leídos", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [
        crearConversacion({ id: 1, unreadCount: 3 }),
        crearConversacion({
          id: 2,
          nombre: "Equipo soporte",
          unreadCount: 0,
        }),
      ],
    });

    renderizarBandeja();

    const contadores = await screen.findAllByLabelText(
      /mensajes no leídos/,
    );

    expect(contadores).toHaveLength(2);
    expect(contadores[0].textContent).toBe("3");
    expect(contadores[1].textContent).toBe("0");
    expect(
      contadores[0].classList.contains(
        "chat-internal__unread--pending",
      ),
    ).toBe(true);
    expect(
      contadores[1].classList.contains(
        "chat-internal__unread--pending",
      ),
    ).toBe(false);
  });

  it("muestra cero si falta el contador", async () => {
    const conversacion = crearConversacion();
    delete conversacion.unreadCount;

    listarConversacionesInternas.mockResolvedValue({
      conversations: [conversacion],
    });

    renderizarBandeja();

    const contador = await screen.findByLabelText(
      "0 mensajes no leídos",
    );

    expect(contador.textContent).toBe("0");
  });

  it("mantiene alineados encabezados y columnas", async () => {
    listarConversacionesInternas.mockResolvedValue({
      conversations: [
        crearConversacion({ unreadCount: 4 }),
      ],
    });

    renderizarBandeja();

    const tabla = await screen.findByRole("table");
    const filas = within(tabla).getAllByRole("row");

    const encabezados = within(filas[0])
      .getAllByRole("columnheader")
      .map((celda) => celda.textContent);

    expect(encabezados).toEqual([
      "Conversación",
      "Tipo",
      "Participantes",
      "No leídos",
      "Estado",
      "Actualización",
      "Acciones",
    ]);

    const celdas = within(filas[1]).getAllByRole("cell");

    expect(celdas).toHaveLength(encabezados.length);
    expect(celdas[0].textContent).toBe("Equipo comercial CRM");
    expect(celdas[1].textContent).toBe("Grupal");
    expect(celdas[2].textContent).toBe("Sin participantes");
    expect(celdas[3].textContent).toBe("4");
    expect(celdas[4].textContent).toBe("EN_CURSO");

    expect(
      within(celdas[6]).getByRole("link", {
        name: "Ver mensajes",
      }).getAttribute("href"),
    ).toBe("/chat/interno/2");
  });
});
