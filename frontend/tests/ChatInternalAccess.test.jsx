
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const authMock = vi.hoisted(() => ({
  autenticado: true,
  usuario: { role: "Administrador" },
  logout: vi.fn(),
}));

vi.mock("../src/context/useAuth.js", () => ({
  useAuth: () => authMock,
}));

import ProtectedRoute from "../src/routes/ProtectedRoute.jsx";
import RoleRoute from "../src/routes/RoleRoute.jsx";
import Sidebar from "../src/components/Sidebar/Sidebar.jsx";

afterEach(() => {
  cleanup();
  authMock.autenticado = true;
  authMock.usuario = { role: "Administrador" };
  vi.clearAllMocks();
});

function renderizarRutaInterna() {
  return render(
    <MemoryRouter initialEntries={["/chat/interno"]}>
      <Routes>
        <Route path="/login" element={<p>Página de login</p>} />
        <Route element={<ProtectedRoute />}>
          <Route
            path="/chat/interno"
            element={<p>Bandeja interna autorizada</p>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("CH-05.3.2 - Acceso al chat interno", () => {
  it.each(["Administrador", "Vendedor", "Usuario"])(
    "permite acceder al rol %s",
    (role) => {
      authMock.usuario = { role };
      authMock.autenticado = true;

      renderizarRutaInterna();

      expect(
        screen.getByText("Bandeja interna autorizada"),
      ).toBeTruthy();
    },
  );

  it("redirige a login cuando no hay autenticación", () => {
    authMock.autenticado = false;

    renderizarRutaInterna();

    expect(
      screen.getByText("Página de login"),
    ).toBeTruthy();
  });

  it.each(["Administrador", "Vendedor", "Usuario"])(
    "muestra el enlace de chat interno para %s",
    (role) => {
      authMock.usuario = { role };

      render(
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("link", { name: "Chat interno" })
          .getAttribute("href"),
      ).toBe("/chat/interno");
    },
  );

  it("impide que el rol Usuario acceda al chat comercial", () => {
    authMock.usuario = { role: "Usuario" };

    render(
      <MemoryRouter initialEntries={["/chat/comercial"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={<p>Dashboard autorizado</p>}
          />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <RoleRoute
                  rolesPermitidos={["Administrador", "Vendedor"]}
                />
              }
            >
              <Route
                path="/chat/comercial"
                element={<p>Bandeja comercial</p>}
              />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Dashboard autorizado"),
    ).toBeTruthy();

    expect(
      screen.queryByText("Bandeja comercial"),
    ).toBeNull();
  });
});
