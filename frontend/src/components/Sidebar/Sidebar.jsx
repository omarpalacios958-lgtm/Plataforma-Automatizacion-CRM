import { NavLink } from "react-router-dom";

import { useAuth } from "../../context/useAuth";

function Sidebar() {
  const { usuario, logout } = useAuth();

  const esAdministrador = usuario.role === "Administrador";
  const esVendedor = usuario.role === "Vendedor";
  const esUsuario = usuario.role === "Usuario";

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        CRM Empresarial
      </div>

      <nav className="sidebar__navigation">
        <section className="sidebar__section">
          <h2 className="sidebar__section-title">
            Principal
          </h2>

          <ul className="sidebar__menu">
            <li>
              <NavLink to="/dashboard">
                Dashboard
              </NavLink>
            </li>

            {(esAdministrador || esVendedor) && (
              <>
                <li>
                  <NavLink to="/contactos">
                    Contactos
                  </NavLink>
                </li>

                <li>
                  <NavLink to="/empresas">
                    Empresas
                  </NavLink>
                </li>

                <li>
                  <NavLink to="/leads">
                    Leads
                  </NavLink>
                </li>

                <li>
                  <NavLink to="/oportunidades">
                    Oportunidades
                  </NavLink>
                </li>

                <li>
                  <NavLink to="/actividades">
                    Actividades
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </section>

        <section className="sidebar__section">
          <h2 className="sidebar__section-title">
            Gestión
          </h2>

          <ul className="sidebar__menu">
            {(esAdministrador || esVendedor || esUsuario) && (
              <>
                <li>
                  <NavLink to="/tareas">
                    Tareas
                  </NavLink>
                </li>

                <li>
                  <NavLink to="/notificaciones">
                    Notificaciones
                  </NavLink>
                </li>
              </>
            )}

            {(esAdministrador || esVendedor) && (
              <li>
                <NavLink to="/archivos">
                  Archivos
                </NavLink>
              </li>
            )}
          </ul>
        </section>

        {esAdministrador && (
  <section className="sidebar__section">
    <h2 className="sidebar__section-title">Sistema</h2>
    <ul className="sidebar__menu">
      <li>
        <NavLink to="/usuarios">Usuarios</NavLink>
      </li>
      <li>
        <NavLink to="/automatizaciones">Automatizaciones</NavLink>
      </li>
    </ul>
  </section>
)}
      </nav>

      <div className="sidebar__footer">
        <button
          type="button"
          onClick={logout}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;