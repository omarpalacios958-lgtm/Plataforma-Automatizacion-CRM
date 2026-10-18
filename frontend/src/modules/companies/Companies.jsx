import { useEffect, useState } from "react";

import "./Companies.css";

import {
  actualizarEmpresa,
  crearEmpresa,
  eliminarEmpresa,
  obtenerEmpresas,
} from "../../services/company.service";

const formularioInicial = {
  nombre: "",
  razonSocial: "",
  rfc: "",
  industria: "",
  sitioWeb: "",
  telefono: "",
  direccion: "",
};

function Companies() {
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [empresaEliminando, setEmpresaEliminando] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [empresaEditando, setEmpresaEditando] = useState(null);

  const cargarEmpresas = async () => {
    try {
      const data = await obtenerEmpresas();

      setEmpresas(data);
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    const cargarEmpresasIniciales = async () => {
      try {
        const data = await obtenerEmpresas();

        setEmpresas(data);
        setError("");
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    };

    cargarEmpresasIniciales();
  }, []);

  const manejarCambio = (event) => {
    const { name, value } = event.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
  };

  const abrirFormulario = () => {
    setFormulario(formularioInicial);
    setEmpresaEditando(null);
    setErrorFormulario("");
    setMostrarFormulario(true);
  };

  const abrirFormularioEdicion = (empresa) => {
    setFormulario({
      nombre: empresa.nombre || "",
      razonSocial: empresa.razonSocial || "",
      rfc: empresa.rfc || "",
      industria: empresa.industria || "",
      sitioWeb: empresa.sitioWeb || "",
      telefono: empresa.telefono || "",
      direccion: empresa.direccion || "",
    });

    setEmpresaEditando(empresa);
    setErrorFormulario("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setFormulario(formularioInicial);
    setEmpresaEditando(null);
    setErrorFormulario("");
    setMostrarFormulario(false);
  };

  const manejarEnvio = async (event) => {
    event.preventDefault();

    try {
      setGuardando(true);
      setErrorFormulario("");

      if (empresaEditando) {
        await actualizarEmpresa(empresaEditando.id, formulario);
      } else {
        await crearEmpresa(formulario);
      }

      setFormulario(formularioInicial);
      setEmpresaEditando(null);
      setMostrarFormulario(false);

      await cargarEmpresas();
    } catch (error) {
      setErrorFormulario(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const manejarEliminacion = async (empresa) => {
    const confirmar = window.confirm(
      `¿Está seguro de eliminar la empresa "${empresa.nombre}"?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminando(true);
      setEmpresaEliminando(empresa.id);
      setError("");

      await eliminarEmpresa(empresa.id);
      await cargarEmpresas();
    } catch (error) {
      setError(error.message);
    } finally {
      setEliminando(false);
      setEmpresaEliminando(null);
    }
  };

  if (cargando) {
    return (
      <section className="companies">
        <div className="companies__header">
          <div>
            <h2 className="companies__title">Empresas</h2>
            <p className="companies__description">
              Gestiona las empresas registradas en el sistema.
            </p>
          </div>
        </div>

        <div className="companies__empty">
          <p>Cargando empresas...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="companies">
        <div className="companies__header">
          <div>
            <h2 className="companies__title">Empresas</h2>
            <p className="companies__description">
              Gestiona las empresas registradas en el sistema.
            </p>
          </div>
        </div>

        <div className="companies__error">
          <p>No fue posible obtener las empresas.</p>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="companies">
      <div className="companies__header">
        <div>
          <h2 className="companies__title">Empresas</h2>
          <p className="companies__description">
            Gestiona las empresas registradas en el sistema.
          </p>
        </div>

        <button
          type="button"
          className="companies__button"
          onClick={abrirFormulario}
          disabled={eliminando}
        >
          Nueva empresa
        </button>
      </div>

      {mostrarFormulario && (
        <div className="companies__form-container">
          <div className="companies__form-header">
            <div>
              <h3>
                {empresaEditando ? "Editar empresa" : "Registrar empresa"}
              </h3>
              <p>
                {empresaEditando
                  ? "Modifica la información de la empresa."
                  : "Completa la información de la nueva empresa."}
              </p>
            </div>
          </div>

          <form className="companies__form" onSubmit={manejarEnvio}>
            <div className="companies__form-group companies__form-group--full">
              <label htmlFor="nombre">Nombre *</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={formulario.nombre}
                onChange={manejarCambio}
                maxLength={100}
                required
              />
            </div>

            <div className="companies__form-row">
              <div className="companies__form-group">
                <label htmlFor="razonSocial">Razón social</label>
                <input
                  id="razonSocial"
                  name="razonSocial"
                  type="text"
                  value={formulario.razonSocial}
                  onChange={manejarCambio}
                  maxLength={150}
                />
              </div>

              <div className="companies__form-group">
                <label htmlFor="rfc">RFC</label>
                <input
                  id="rfc"
                  name="rfc"
                  type="text"
                  value={formulario.rfc}
                  onChange={manejarCambio}
                  maxLength={20}
                />
              </div>
            </div>

            <div className="companies__form-row">
              <div className="companies__form-group">
                <label htmlFor="industria">Industria</label>
                <input
                  id="industria"
                  name="industria"
                  type="text"
                  value={formulario.industria}
                  onChange={manejarCambio}
                  maxLength={100}
                />
              </div>

              <div className="companies__form-group">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  id="telefono"
                  name="telefono"
                  type="text"
                  value={formulario.telefono}
                  onChange={manejarCambio}
                  maxLength={20}
                />
              </div>
            </div>

            <div className="companies__form-group companies__form-group--full">
              <label htmlFor="sitioWeb">Sitio web</label>
              <input
                id="sitioWeb"
                name="sitioWeb"
                type="url"
                value={formulario.sitioWeb}
                onChange={manejarCambio}
                placeholder="https://ejemplo.com"
              />
            </div>

            <div className="companies__form-group companies__form-group--full">
              <label htmlFor="direccion">Dirección</label>
              <textarea
                id="direccion"
                name="direccion"
                value={formulario.direccion}
                onChange={manejarCambio}
                maxLength={255}
                rows={3}
              />
            </div>

            {errorFormulario && (
              <div className="companies__form-error">
                <p>{errorFormulario}</p>
              </div>
            )}

            <div className="companies__form-actions">
              <button
                type="button"
                className="companies__button companies__button--secondary"
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="companies__button"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : empresaEditando
                    ? "Guardar cambios"
                    : "Guardar empresa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {empresas.length === 0 ? (
        <div className="companies__empty">
          <p>No hay empresas registradas.</p>
        </div>
      ) : (
        <div className="companies__table-container">
          <table className="companies__table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Razón social</th>
                <th>RFC</th>
                <th>Industria</th>
                <th>Teléfono</th>
                <th>Sitio web</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id}>
                  <td>{empresa.nombre}</td>
                  <td>{empresa.razonSocial || "-"}</td>
                  <td>{empresa.rfc || "-"}</td>
                  <td>{empresa.industria || "-"}</td>
                  <td>{empresa.telefono || "-"}</td>
                  <td>{empresa.sitioWeb || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="companies__button companies__button--secondary"
                      onClick={() => abrirFormularioEdicion(empresa)}
                      disabled={eliminando}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="companies__button companies__button--secondary"
                      onClick={() => manejarEliminacion(empresa)}
                      disabled={eliminando}
                    >
                      {empresaEliminando === empresa.id
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Companies;