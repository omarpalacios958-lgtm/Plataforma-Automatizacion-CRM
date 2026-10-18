import { useAuth } from "../../context/useAuth";

function Header() {
  const { usuario } = useAuth();

  const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;
  const iniciales = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`;

  return (
    <header className="header">
      <div className="header__page-info">
        <h1 className="header__title">
          Dashboard
        </h1>

        <p className="header__subtitle">
          Resumen general de la actividad comercial
        </p>
      </div>

      <div className="header__user">
        <div className="header__user-info">
          <span className="header__user-name">
            {nombreCompleto}
          </span>

          <span className="header__user-role">
            {usuario.role}
          </span>
        </div>

        <div className="header__user-avatar">
          {iniciales}
        </div>
      </div>
    </header>
  );
}

export default Header;