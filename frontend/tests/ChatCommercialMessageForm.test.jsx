
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

import ChatCommercialMessageForm from "../src/modules/chat/ChatCommercialMessageForm.jsx";

import {
  enviarMensajeComercial,
} from "../src/services/chat-commercial.service.js";

vi.mock("../src/services/chat-commercial.service.js", () => ({
  enviarMensajeComercial: vi.fn(),
}));

function respuestaExitosa(
  conversationId,
  contenido,
  clientMessageId,
) {
  return {
    success: true,
    creado: true,
    data: {
      id: 101,
      conversationId,
      participantId: 5,
      contenido,
      clientMessageId,
      createdAt: "2026-11-02T10:00:00.000Z",
      editedAt: null,
      deletedAt: null,
    },
  };
}

function renderizarFormulario(
  conversationId = 3,
  onMensajeEnviado = vi.fn(),
) {
  return render(
    <ChatCommercialMessageForm
      conversationId={conversationId}
      onMensajeEnviado={onMensajeEnviado}
    />,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ChatCommercialMessageForm", () => {

  it("conserva clientMessageId si solo cambian espacios exteriores", async () => {
    enviarMensajeComercial.mockRejectedValue(
      new Error("Error de red"),
    );

    renderizarFormulario();

    const campo = screen.getByRole("textbox", {
      name: "Mensaje",
    });

    fireEvent.change(campo, {
      target: { value: "Mensaje importante" },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    await screen.findByRole("alert");

    fireEvent.change(campo, {
      target: { value: "  Mensaje importante  " },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    await waitFor(() => {
      expect(enviarMensajeComercial).toHaveBeenCalledTimes(2);
    });

    const primerEnvio = enviarMensajeComercial.mock.calls[0][1];
    const segundoEnvio = enviarMensajeComercial.mock.calls[1][1];

    expect(segundoEnvio.clientMessageId).toBe(
      primerEnvio.clientMessageId,
    );

    expect(segundoEnvio.contenido).toBe("Mensaje importante");
  });

  it("no permite enviar contenido vacío", () => {
    renderizarFormulario();

    expect(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }).disabled,
    ).toBe(true);

    expect(enviarMensajeComercial).not.toHaveBeenCalled();
  });

  it("envía un mensaje válido y limpia el formulario", async () => {
    const onMensajeEnviado = vi.fn();

    enviarMensajeComercial.mockImplementation(
      async (conversationId, datos) =>
        respuestaExitosa(
          conversationId,
          datos.contenido,
          datos.clientMessageId,
        ),
    );

    renderizarFormulario(3, onMensajeEnviado);

    const campo = screen.getByRole("textbox", {
      name: "Mensaje",
    });

    fireEvent.change(campo, {
      target: { value: "  Hola, buen día  " },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    await waitFor(() => {
      expect(onMensajeEnviado).toHaveBeenCalledTimes(1);
    });

    expect(enviarMensajeComercial).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        contenido: "Hola, buen día",
        clientMessageId: expect.any(String),
      }),
    );

    expect(campo.value).toBe("");
  });

  it("evita envíos duplicados mientras espera respuesta", async () => {
    let resolver;

    enviarMensajeComercial.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );

    renderizarFormulario();

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }),
      {
        target: { value: "Mensaje de prueba" },
      },
    );

    const boton = screen.getByRole("button", {
      name: "Enviar respuesta",
    });

    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(enviarMensajeComercial).toHaveBeenCalledTimes(1);

    const datos = enviarMensajeComercial.mock.calls[0][1];

    await act(async () => {
      resolver(
        respuestaExitosa(
          3,
          datos.contenido,
          datos.clientMessageId,
        ),
      );
    });
  });

  it("conserva clientMessageId al reintentar un error de red", async () => {
    enviarMensajeComercial
      .mockRejectedValueOnce(new Error("Error de conexión"))
      .mockImplementationOnce(
        async (conversationId, datos) =>
          respuestaExitosa(
            conversationId,
            datos.contenido,
            datos.clientMessageId,
          ),
      );

    renderizarFormulario();

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }),
      {
        target: { value: "Reintento seguro" },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    await screen.findByRole("alert");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    await waitFor(() => {
      expect(enviarMensajeComercial).toHaveBeenCalledTimes(2);
    });

    const primerEnvio = enviarMensajeComercial.mock.calls[0][1];
    const segundoEnvio = enviarMensajeComercial.mock.calls[1][1];

    expect(segundoEnvio.clientMessageId).toBe(
      primerEnvio.clientMessageId,
    );
  });

  it("genera una clave nueva cuando cambia el contenido", async () => {
    enviarMensajeComercial.mockRejectedValue(
      new Error("Error de red"),
    );

    renderizarFormulario();

    const campo = screen.getByRole("textbox", {
      name: "Mensaje",
    });

    fireEvent.change(campo, {
      target: { value: "Primer contenido" },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    await screen.findByRole("alert");

    fireEvent.change(campo, {
      target: { value: "Contenido modificado" },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    await waitFor(() => {
      expect(enviarMensajeComercial).toHaveBeenCalledTimes(2);
    });

    expect(
      enviarMensajeComercial.mock.calls[0][1].clientMessageId,
    ).not.toBe(
      enviarMensajeComercial.mock.calls[1][1].clientMessageId,
    );
  });

  it("ignora respuestas tardías de otra conversación", async () => {
    let resolverPrimera;
    const onMensajeEnviado = vi.fn();

    enviarMensajeComercial.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolverPrimera = resolve;
        }),
    );

    const vista = render(
  <ChatCommercialMessageForm
    key="commercial-form-3"
    conversationId={3}
    onMensajeEnviado={onMensajeEnviado}
  />,
);

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }),
      {
        target: { value: "Mensaje anterior" },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    const datos = enviarMensajeComercial.mock.calls[0][1];

    vista.rerender(
  <ChatCommercialMessageForm
    key="commercial-form-4"
    conversationId={4}
    onMensajeEnviado={onMensajeEnviado}
  />,
);

    await act(async () => {
      resolverPrimera(
        respuestaExitosa(
          3,
          datos.contenido,
          datos.clientMessageId,
        ),
      );
    });

    expect(onMensajeEnviado).not.toHaveBeenCalled();

    expect(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }).value,
    ).toBe("");
  });

  it("rechaza una respuesta de otra conversación", async () => {
    enviarMensajeComercial.mockImplementation(
      async (_, datos) =>
        respuestaExitosa(
          99,
          datos.contenido,
          datos.clientMessageId,
        ),
    );

    renderizarFormulario();

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Mensaje",
      }),
      {
        target: { value: "Mensaje de prueba" },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Enviar respuesta",
      }),
    );

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain("no es válida");
  });
});
