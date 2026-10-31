// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import ChatVisitorMessageForm from "../src/modules/chat/ChatVisitorMessageForm.jsx";
import { enviarMensajeVisitante } from "../src/services/chat-visitor.service.js";

vi.mock("../src/services/chat-visitor.service.js", () => ({
  enviarMensajeVisitante: vi.fn(),
}));
afterEach(() => {
  cleanup();
});

const MENSAJE = {
  id: 25,
  conversationId: 4,
  participantId: 7,
  contenido: "Hola desde las pruebas",
  clientMessageId: "mensaje_prueba_12345678",
  createdAt: "2026-10-30T12:00:00.000Z",
  editedAt: null,
  deletedAt: null,
};

function prepararFormulario() {
  const onMensajeEnviado = vi.fn();

  render(
    <ChatVisitorMessageForm
      conversationId={4}
      onMensajeEnviado={onMensajeEnviado}
    />,
  );

  return {
    onMensajeEnviado,
    campo: screen.getByLabelText("Escribe tu mensaje"),
    boton: screen.getByRole("button", { name: "Enviar mensaje" }),
  };
}

describe("ChatVisitorMessageForm - envío de mensajes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
it("ignora una respuesta recibida después de desmontar el formulario", async () => {
  let resolverEnvio;

  enviarMensajeVisitante.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolverEnvio = resolve;
      }),
  );

  const onMensajeEnviado = vi.fn();

  const { unmount } = render(
    <ChatVisitorMessageForm
      conversationId={4}
      onMensajeEnviado={onMensajeEnviado}
    />,
  );

  fireEvent.change(screen.getByLabelText("Escribe tu mensaje"), {
    target: { value: "Mensaje pendiente" },
  });

  fireEvent.click(
    screen.getByRole("button", { name: "Enviar mensaje" }),
  );

  expect(enviarMensajeVisitante).toHaveBeenCalledTimes(1);

  unmount();

  resolverEnvio({
    success: true,
    data: MENSAJE,
    creado: true,
  });

  await Promise.resolve();

  expect(onMensajeEnviado).not.toHaveBeenCalled();
});


  it("no permite enviar contenido vacío", () => {
    const { boton } = prepararFormulario();

    expect(boton.disabled).toBe(true);
    expect(enviarMensajeVisitante).not.toHaveBeenCalled();
  });

  it("envía un mensaje válido y limpia el formulario", async () => {
    enviarMensajeVisitante.mockResolvedValue({
      success: true,
      data: MENSAJE,
      creado: true,
    });

    const { campo, boton, onMensajeEnviado } = prepararFormulario();

    fireEvent.change(campo, {
      target: { value: "  Hola desde las pruebas  " },
    });

    fireEvent.click(boton);

    await waitFor(() => {
      expect(enviarMensajeVisitante).toHaveBeenCalledTimes(1);
      expect(onMensajeEnviado).toHaveBeenCalledWith(MENSAJE);
    });

    expect(enviarMensajeVisitante).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        contenido: "Hola desde las pruebas",
        clientMessageId: expect.stringMatching(
          /^[A-Za-z0-9_-]{8,128}$/,
        ),
      }),
    );

    expect(campo.value).toBe("");
  });

  it("evita envíos simultáneos", async () => {
    let resolver;

    enviarMensajeVisitante.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );

    const { campo, boton } = prepararFormulario();

    fireEvent.change(campo, {
      target: { value: "Hola desde las pruebas" },
    });

    fireEvent.click(boton);

    expect(screen.getByRole("button", { name: "Enviando..." }).disabled)
      .toBe(true);

    expect(enviarMensajeVisitante).toHaveBeenCalledTimes(1);

    resolver({
      success: true,
      data: MENSAJE,
      creado: true,
    });

    await waitFor(() => {
      expect(boton.disabled).toBe(true);
      expect(campo.value).toBe("");
    });
  });

  it("conserva el texto cuando falla el envío", async () => {
    enviarMensajeVisitante.mockRejectedValue(
      new Error("Error de conexión"),
    );

    const { campo, boton, onMensajeEnviado } = prepararFormulario();

    fireEvent.change(campo, {
      target: { value: "Hola desde las pruebas" },
    });

    fireEvent.click(boton);

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Error de conexión",
    );

    expect(campo.value).toBe("Hola desde las pruebas");
    expect(onMensajeEnviado).not.toHaveBeenCalled();
  });

  it("reutiliza clientMessageId al reintentar el mismo texto", async () => {
    enviarMensajeVisitante
      .mockRejectedValueOnce(new Error("Error de conexión"))
      .mockResolvedValueOnce({
        success: true,
        data: MENSAJE,
        creado: false,
      });

    const { campo, boton, onMensajeEnviado } = prepararFormulario();

    fireEvent.change(campo, {
      target: { value: "Hola desde las pruebas" },
    });

    fireEvent.click(boton);

    await screen.findByRole("alert");

    fireEvent.click(boton);

    await waitFor(() => {
      expect(enviarMensajeVisitante).toHaveBeenCalledTimes(2);
    });

    const primerEnvio = enviarMensajeVisitante.mock.calls[0][1];
    const segundoEnvio = enviarMensajeVisitante.mock.calls[1][1];

    expect(segundoEnvio.clientMessageId).toBe(
      primerEnvio.clientMessageId,
    );

    await waitFor(() => {
      expect(onMensajeEnviado).toHaveBeenCalledTimes(1);
    });
  });

  it("genera otro identificador cuando cambia el mensaje", async () => {
    enviarMensajeVisitante
      .mockRejectedValueOnce(new Error("Error de conexión"))
      .mockResolvedValueOnce({
        success: true,
        data: MENSAJE,
        creado: true,
      });

    const { campo, boton } = prepararFormulario();

    fireEvent.change(campo, {
      target: { value: "Primer contenido" },
    });

    fireEvent.click(boton);

    await screen.findByRole("alert");

    fireEvent.change(campo, {
      target: { value: "Segundo contenido" },
    });

    fireEvent.click(boton);

    await waitFor(() => {
      expect(enviarMensajeVisitante).toHaveBeenCalledTimes(2);
    });

    const primerEnvio = enviarMensajeVisitante.mock.calls[0][1];
    const segundoEnvio = enviarMensajeVisitante.mock.calls[1][1];

    expect(primerEnvio.clientMessageId).not.toBe(
      segundoEnvio.clientMessageId,
    );
  });

  it("rechaza una respuesta sin identificador de mensaje", async () => {
    enviarMensajeVisitante.mockResolvedValue({
      success: true,
      data: {},
      creado: true,
    });

    const { campo, boton, onMensajeEnviado } = prepararFormulario();

    fireEvent.change(campo, {
      target: { value: "Hola desde las pruebas" },
    });

    fireEvent.click(boton);

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Respuesta de envío inválida.",
    );

    expect(onMensajeEnviado).not.toHaveBeenCalled();
    expect(campo.value).toBe("Hola desde las pruebas");
  });
});
