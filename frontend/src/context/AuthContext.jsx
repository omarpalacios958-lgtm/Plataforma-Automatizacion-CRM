import { createContext, useState } from "react";

import { login as loginService } from "../services/auth.service";

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = "crm_token";
const USER_STORAGE_KEY = "crm_usuario";

function obtenerSesionInicial() {
  const tokenGuardado = localStorage.getItem(TOKEN_STORAGE_KEY);
  const usuarioGuardado = localStorage.getItem(USER_STORAGE_KEY);

  if (!tokenGuardado || !usuarioGuardado) {
    return {
      token: null,
      usuario: null,
    };
  }

  try {
    return {
      token: tokenGuardado,
      usuario: JSON.parse(usuarioGuardado),
    };
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);

    return {
      token: null,
      usuario: null,
    };
  }
}

function AuthProvider({ children }) {
  const [sesionInicial] = useState(obtenerSesionInicial);
  const [usuario, setUsuario] = useState(sesionInicial.usuario);
  const [token, setToken] = useState(sesionInicial.token);

  const login = async (correo, password) => {
    const data = await loginService(correo, password);

    setUsuario(data.usuario);
    setToken(data.token);

    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify(data.usuario),
    );

    return data;
  };

  const logout = () => {
    setUsuario(null);
    setToken(null);

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const autenticado = Boolean(token);

  const value = {
    usuario,
    token,
    autenticado,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };