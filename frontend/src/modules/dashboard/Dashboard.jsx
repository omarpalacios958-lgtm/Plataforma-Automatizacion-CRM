import { useEffect, useState } from "react";

import "./Dashboard.css";

import { useAuth } from "../../context/useAuth";
import { obtenerEstadisticas } from "../../services/dashboard.service";

function Dashboard() {
  const { usuario } = useAuth();

  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        setCargando(true);
        setError("");

        const data = await obtenerEstadisticas();

        setEstadisticas(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    };

    cargarEstadisticas();
  }, []);

  const esUsuario = usuario.role === "Usuario";

  if (cargando) {
    return (
      <section className="dashboard">
        <div className="dashboard__header">
          <div>
            <h2 className="dashboard__title">Resumen general</h2>
            <p className="dashboard__description">
              Consultando información del sistema...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard">
        <div className="dashboard__header">
          <div>
            <h2 className="dashboard__title">Resumen general</h2>
            <p className="dashboard__description">
              No fue posible obtener las estadísticas.
            </p>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__content">
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard">
      <div className="dashboard__header">
        <div>
          <h2 className="dashboard__title">Resumen general</h2>
          <p className="dashboard__description">
            Consulta el estado actual de la actividad comercial.
          </p>
        </div>
      </div>

      {!esUsuario && (
        <div className="dashboard__summary">
          <article className="dashboard-card">
            <span className="dashboard-card__label">Contactos</span>
            <strong className="dashboard-card__value">
              {estadisticas.contactos}
            </strong>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card__label">Leads activos</span>
            <strong className="dashboard-card__value">
              {estadisticas.leads}
            </strong>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card__label">Oportunidades</span>
            <strong className="dashboard-card__value">
              {estadisticas.oportunidades}
            </strong>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card__label">
              Valor del pipeline
            </span>
            <strong className="dashboard-card__value">
              ${estadisticas.valorTotalOportunidades}
            </strong>
          </article>
        </div>
      )}

      <div className="dashboard__sections">
        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <h3>Actividades</h3>
          </div>

          <div className="dashboard-panel__content">
            <p>
              Actividades pendientes:{" "}
              <strong>{estadisticas.actividadesPendientes}</strong>
            </p>

            <p>
              Actividades completadas:{" "}
              <strong>{estadisticas.actividadesCompletadas}</strong>
            </p>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <h3>Tareas</h3>
          </div>

          <div className="dashboard-panel__content">
            <p>
              Pendientes:{" "}
              <strong>{estadisticas.tareasPendientes}</strong>
            </p>

            <p>
              En progreso:{" "}
              <strong>{estadisticas.tareasEnProgreso}</strong>
            </p>

            <p>
              Completadas:{" "}
              <strong>{estadisticas.tareasCompletadas}</strong>
            </p>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <h3>Notificaciones</h3>
          </div>

          <div className="dashboard-panel__content">
            <p>
              Notificaciones sin leer:{" "}
              <strong>{estadisticas.notificacionesSinLeer}</strong>
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}

export default Dashboard;