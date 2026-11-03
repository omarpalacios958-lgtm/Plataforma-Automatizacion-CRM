
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
  render,
  screen,
} from "@testing-library/react";

vi.mock("../src/services/chat-internal.service.js", () => ({
  obtenerMensajesInternos: vi.fn(),
}));

import { obtenerMensajesInternos } from "../src/services/chat-internal.service.js";

import useInternalMessagePolling from "../src/modules/chat/useInternalMessagePolling.js";

function mensaje(id, conversationId = 2) {
  return {
    id,
    conversationId,
    participantId: 7,
    contenido: `Mensaje ${id}`,
    createdAt: "2026-11-03T10:00:00.000Z",
    editedAt: null,
    deletedAt: null,
  };
}

function pagina(ids, nextCursor = null, conversationId = 2) {
  return {
    messages: ids.map((id) => mensaje(id, conversationId)),
    nextCursor,
  };
}

function crearDiferida() {
  let resolver;
  let rechazar;

  const promise = new Promise((resolve, reject) => {
    resolver = resolve;
    rechazar = reject;
  });

  return { promise, resolver, rechazar };
}

function PruebaPolling({
  conversationId = 2,
  activo = true,
  initialMessageId = 0,
  onMessages,
}) {
  useInternalMessagePolling({
    conversationId,
    activo,
    initialMessageId,
    onMessages,
  });

  return <p>Polling de prueba</p>;
}

async function avanzar(ms = 5000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("CH-05.6.1 - Polling incremental interno", () => {
  let onMessages;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    onMessages = vi.fn();

    obtenerMensajesInternos.mockResolvedValue(
      pagina([]),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("espera cinco segundos antes de consultar", async () => {
    render(<PruebaPolling onMessages={onMessages} />);

    await avanzar(4999);

    expect(obtenerMensajesInternos).not.toHaveBeenCalled();

    await avanzar(1);

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(1);
  });

  it("consulta con afterId=0 cuando no hay mensajes iniciales", async () => {
    render(<PruebaPolling onMessages={onMessages} />);

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenCalledWith(
      2,
      { limit: 20, afterId: 0 },
    );
  });

  it("consulta desde el último ID inicial", async () => {
    render(
      <PruebaPolling
        initialMessageId={25}
        onMessages={onMessages}
      />,
    );

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenCalledWith(
      2,
      { limit: 20, afterId: 25 },
    );
  });

  it("incorpora mensajes nuevos y avanza el marcador", async () => {
    obtenerMensajesInternos
      .mockResolvedValueOnce(pagina([26, 27]))
      .mockResolvedValueOnce(pagina([]));

    render(
      <PruebaPolling
        initialMessageId={25}
        onMessages={onMessages}
      />,
    );

    await avanzar();

    expect(onMessages).toHaveBeenCalledWith([
      mensaje(26),
      mensaje(27),
    ]);

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenLastCalledWith(
      2,
      { limit: 20, afterId: 27 },
    );
  });

  it("recupera varias páginas incrementales pendientes", async () => {
    obtenerMensajesInternos
      .mockResolvedValueOnce(pagina([26, 27], 27))
      .mockResolvedValueOnce(pagina([28, 29], 29))
      .mockResolvedValueOnce(pagina([30]));

    render(
      <PruebaPolling
        initialMessageId={25}
        onMessages={onMessages}
      />,
    );

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(3);

    expect(obtenerMensajesInternos).toHaveBeenNthCalledWith(
      1,
      2,
      { limit: 20, afterId: 25 },
    );

    expect(obtenerMensajesInternos).toHaveBeenNthCalledWith(
      2,
      2,
      { limit: 20, afterId: 27 },
    );

    expect(obtenerMensajesInternos).toHaveBeenNthCalledWith(
      3,
      2,
      { limit: 20, afterId: 29 },
    );

    expect(onMessages).toHaveBeenCalledTimes(3);
  });

  it("no inicia otra solicitud mientras existe una pendiente", async () => {
    const diferida = crearDiferida();

    obtenerMensajesInternos.mockReturnValue(
      diferida.promise,
    );

    render(<PruebaPolling onMessages={onMessages} />);

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(1);

    await avanzar(15000);

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(1);

    await act(async () => {
      diferida.resolver(pagina([]));
      await diferida.promise;
    });

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(2);
  });

  it("reintenta después de un error temporal", async () => {
    obtenerMensajesInternos
      .mockRejectedValueOnce(new Error("Sin conexión"))
      .mockResolvedValueOnce(pagina([1]));

    render(<PruebaPolling onMessages={onMessages} />);

    await avanzar();

    expect(onMessages).not.toHaveBeenCalled();

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(2);
    expect(onMessages).toHaveBeenCalledWith([mensaje(1)]);
  });

  it("rechaza una página inválida y conserva el marcador", async () => {
    obtenerMensajesInternos
      .mockResolvedValueOnce(pagina([5, 4]))
      .mockResolvedValueOnce(pagina([6]));

    render(
      <PruebaPolling
        initialMessageId={3}
        onMessages={onMessages}
      />,
    );

    await avanzar();

    expect(onMessages).not.toHaveBeenCalled();

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenLastCalledWith(
      2,
      { limit: 20, afterId: 3 },
    );

    expect(onMessages).toHaveBeenCalledWith([mensaje(6)]);
  });

  it("descarta respuestas de una conversación anterior", async () => {
    const diferida = crearDiferida();

    obtenerMensajesInternos
      .mockReturnValueOnce(diferida.promise)
      .mockResolvedValue(pagina([10], null, 3));

    const vista = render(
      <PruebaPolling
        conversationId={2}
        onMessages={onMessages}
      />,
    );

    await avanzar();

    vista.rerender(
      <PruebaPolling
        conversationId={3}
        onMessages={onMessages}
      />,
    );

    await act(async () => {
      diferida.resolver(pagina([8], null, 2));
      await diferida.promise;
    });

    expect(onMessages).not.toHaveBeenCalled();

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenLastCalledWith(
      3,
      { limit: 20, afterId: 0 },
    );

    expect(onMessages).toHaveBeenCalledWith([
      mensaje(10, 3),
    ]);
  });

  it("detiene las consultas después del desmontaje", async () => {
    const vista = render(
      <PruebaPolling onMessages={onMessages} />,
    );

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(1);

    vista.unmount();

    await avanzar(20000);

    expect(obtenerMensajesInternos).toHaveBeenCalledTimes(1);
  });

  it("no consulta cuando el polling está inactivo", async () => {
    render(
      <PruebaPolling
        activo={false}
        onMessages={onMessages}
      />,
    );

    await avanzar(20000);

    expect(obtenerMensajesInternos).not.toHaveBeenCalled();
    expect(screen.getByText("Polling de prueba")).toBeTruthy();
  });

  it("no adelanta el marcador por mensajes externos al polling", async () => {
    obtenerMensajesInternos
      .mockResolvedValueOnce(pagina([26]))
      .mockResolvedValueOnce(pagina([27, 28]));

    const vista = render(
      <PruebaPolling
        initialMessageId={25}
        onMessages={onMessages}
      />,
    );

    await avanzar();

    // Simula que un envío propio ya apareció en la interfaz.
    // El marcador incremental debe seguir en 26.
    vista.rerender(
      <PruebaPolling
        initialMessageId={25}
        onMessages={onMessages}
      />,
    );

    await avanzar();

    expect(obtenerMensajesInternos).toHaveBeenLastCalledWith(
      2,
      { limit: 20, afterId: 26 },
    );

    expect(onMessages).toHaveBeenLastCalledWith([
      mensaje(27),
      mensaje(28),
    ]);
  });
});
