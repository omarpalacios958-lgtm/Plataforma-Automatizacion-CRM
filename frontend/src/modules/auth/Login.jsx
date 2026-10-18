import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Login.css";

import { useAuth } from "../../context/useAuth";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setCargando(true);

    try {
      await login(correo, password);

      console.log("Login realizado correctamente.");

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login">
      <section className="login__card">
        <div className="login__header">
          <span className="login__brand">CRM Empresarial</span>

          <h1 className="login__title">
            Iniciar sesión
          </h1>

          <p className="login__description">
            Ingresa tus credenciales para acceder al sistema.
          </p>
        </div>

        <form
          className="login__form"
          onSubmit={handleSubmit}
        >
          <div className="login__field">
            <label htmlFor="correo">
              Correo electrónico
            </label>

            <input
              id="correo"
              name="correo"
              type="email"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              disabled={cargando}
            />
          </div>

          <div className="login__field">
            <label htmlFor="password">
              Contraseña
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              disabled={cargando}
            />
          </div>

          {error && (
            <p className="login__error">
              {error}
            </p>
          )}

          <button
            className="login__submit"
            type="submit"
            disabled={cargando}
          >
            {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;