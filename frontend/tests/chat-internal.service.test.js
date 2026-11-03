
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/api.js", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "../src/services/api.js";

import {
  listarEmpleadosDisponibles,
  listarConversacionesInternas,
} from "../src/services/chat-internal.service.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("CH-05.2 - Servicio de chat interno", () => {
  it("consulta el directorio de empleados", async () => {
    const employees = [
      { id: 2, nombre: "Juan", apellido: "Pérez" },
    ];

    apiRequest.mockResolvedValue({
      success: true,
      data: { employees },
    });

    const resultado = await listarEmpleadosDisponibles();

    expect(apiRequest).toHaveBeenCalledExactlyOnceWith(
      "/chat/employees",
    );

    expect(resultado).toEqual({ employees });
  });

  it("consulta las conversaciones internas", async () => {
    const conversations = [
      {
        id: 1,
        tipo: "INTERNO_PRIVADO",
        estado: "EN_CURSO",
        nombre: null,
        participants: [],
      },
    ];

    apiRequest.mockResolvedValue({
      success: true,
      data: { conversations },
    });

    const resultado = await listarConversacionesInternas();

    expect(apiRequest).toHaveBeenCalledExactlyOnceWith(
      "/chat/conversations",
    );

    expect(resultado).toEqual({ conversations });
  });

  it("propaga errores de autenticación", async () => {
    const error = Object.assign(
      new Error("No autorizado."),
      { status: 401 },
    );

    apiRequest.mockRejectedValue(error);

    await expect(
      listarConversacionesInternas(),
    ).rejects.toMatchObject({
      message: "No autorizado.",
      status: 401,
    });
  });

  it("propaga errores del servidor", async () => {
    const error = Object.assign(
      new Error("Error interno."),
      { status: 500 },
    );

    apiRequest.mockRejectedValue(error);

    await expect(
      listarEmpleadosDisponibles(),
    ).rejects.toMatchObject({
      message: "Error interno.",
      status: 500,
    });
  });
});
