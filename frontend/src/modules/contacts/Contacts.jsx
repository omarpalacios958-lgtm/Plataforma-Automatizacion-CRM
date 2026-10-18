import { useEffect, useState } from "react";

import "./Contacts.css";

import { obtenerEmpresas } from "../../services/company.service";
import {
  actualizarContacto,
  crearContacto,
  eliminarContacto,
  obtenerContactos,
} from "../../services/contact.service";

const formularioInicial = {
  nombre: "",
  apellido: "",
  correo: "",
  telefono: "",
  puesto: "",
  companyId: "",
};

function Contacts() {
  const [contactos, setContactos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [contactoEliminando, setContactoEliminando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [contactoEditando, setContactoEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [error, setError] = useState("");
  const [errorFormulario, setErrorFormulario] = useState("");

  const cargarContactos = async () => {
    try {
      const data = await obtenerContactos();

      setContactos(data);
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setCargando(true);
        setError("");

        const [contactosData, empresasData] = await Promise.all([
          obtenerContactos(),
          obtenerEmpresas(),
        ]);

        setContactos(contactosData);
        setEmpresas(empresasData);
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosIniciales();
  }, []);

  const manejarCambio = (event) => {
    const { name, value } = event.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
  };

  const abrirFormulario = () => {
    setContactoEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario("");
    setMostrarFormulario(true);
  };

  const abrirEdicion = (contacto) => {
    setContactoEditando(contacto);
    setFormulario({
      nombre: contacto.nombre || "",
      apellido: contacto.apellido || "",
      correo: contacto.correo || "",
      telefono: contacto.telefono || "",
      puesto: contacto.puesto || "",
      companyId: contacto.companyId ? String(contacto.companyId) : "",
    });
    setErrorFormulario("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setContactoEditando(null);
    setFormulario(formularioInicial);
    setErrorFormulario("");
    setMostrarFormulario(false);
  };

  const manejarEnvio = async (event) => {
    event.preventDefault();

    try {
      setGuardando(true);
      setErrorFormulario("");

      const datosContacto = {
        ...formulario,
        companyId: formulario.companyId
          ? Number(formulario.companyId)
          : undefined,
      };

      if (contactoEditando) {
        await actualizarContacto(contactoEditando.id, datosContacto);
      } else {
        await crearContacto(datosContacto);
      }

      setFormulario(formularioInicial);
      setContactoEditando(null);
      setMostrarFormulario(false);

      await cargarContactos();
    } catch (error) {
      setErrorFormulario(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const manejarEliminacion = async (contacto) => {
    const confirmar = window.confirm(
      `¿Está seguro de eliminar el contacto "${contacto.nombre} ${contacto.apellido || ""}"?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminando(true);
      setContactoEliminando(contacto.id);
      setError("");

      await eliminarContacto(contacto.id);

      await cargarContactos();
    } catch (error) {
      setError(error.message);
    } finally {
      setEliminando(false);
      setContactoEliminando(null);
    }
  };

  if (cargando) {
    return (
      <section className="contacts">
        <div className="contacts__header">
          <div>
            <h2 className="contacts__title">Contactos</h2>
            <p className="contacts__description">
              Gestiona los contactos registrados en el sistema.
            </p>
          </div>
        </div>

        <div className="contacts__empty">
          <p>Cargando contactos...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="contacts">
        <div className="contacts__header">
          <div>
            <h2 className="contacts__title">Contactos</h2>
            <p className="contacts__description">
              Gestiona los contactos registrados en el sistema.
            </p>
          </div>
        </div>

        <div className="contacts__error">
          <p>No fue posible obtener los datos.</p>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="contacts">
      <div className="contacts__header">
        <div>
          <h2 className="contacts__title">Contactos</h2>
          <p className="contacts__description">
            Gestiona los contactos registrados en el sistema.
          </p>
        </div>

        <button
          type="button"
          className="contacts__button"
          onClick={abrirFormulario}
          disabled={eliminando}
        >
          Nuevo contacto
        </button>
      </div>

      {mostrarFormulario && (
        <div className="contacts__form-container">
          <div className="contacts__form-header">
            <div>
              <h3>
                {contactoEditando
                  ? "Editar contacto"
                  : "Registrar contacto"}
              </h3>
              <p>
                {contactoEditando
                  ? "Modifica la información del contacto."
                  : "Completa la información del nuevo contacto."}
              </p>
            </div>
          </div>

          <form className="contacts__form" onSubmit={manejarEnvio}>
            <div className="contacts__form-row">
              <div className="contacts__form-group">
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

              <div className="contacts__form-group">
                <label htmlFor="apellido">Apellido</label>
                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  value={formulario.apellido}
                  onChange={manejarCambio}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="contacts__form-row">
              <div className="contacts__form-group">
                <label htmlFor="correo">Correo</label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  value={formulario.correo}
                  onChange={manejarCambio}
                />
              </div>

              <div className="contacts__form-group">
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

            <div className="contacts__form-row">
              <div className="contacts__form-group">
                <label htmlFor="puesto">Puesto</label>
                <input
                  id="puesto"
                  name="puesto"
                  type="text"
                  value={formulario.puesto}
                  onChange={manejarCambio}
                  maxLength={100}
                />
              </div>

              <div className="contacts__form-group">
                <label htmlFor="companyId">Empresa</label>
                <select
                  id="companyId"
                  name="companyId"
                  value={formulario.companyId}
                  onChange={manejarCambio}
                >
                  <option value="">Sin empresa</option>

                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errorFormulario && (
              <div className="contacts__form-error">
                <p>{errorFormulario}</p>
              </div>
            )}

            <div className="contacts__form-actions">
              <button
                type="button"
                className="contacts__button contacts__button--secondary"
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="contacts__button"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : contactoEditando
                    ? "Actualizar contacto"
                    : "Guardar contacto"}
              </button>
            </div>
          </form>
        </div>
      )}

      {contactos.length === 0 ? (
        <div className="contacts__empty">
          <p>No hay contactos registrados.</p>
        </div>
      ) : (
        <div className="contacts__table-container">
          <table className="contacts__table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Puesto</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {contactos.map((contacto) => (
                <tr key={contacto.id}>
                  <td>{contacto.nombre}</td>
                  <td>{contacto.apellido || "-"}</td>
                  <td>{contacto.correo || "-"}</td>
                  <td>{contacto.telefono || "-"}</td>
                  <td>{contacto.puesto || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="contacts__button contacts__button--secondary"
                      onClick={() => abrirEdicion(contacto)}
                      disabled={eliminando}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="contacts__button contacts__button--secondary"
                      onClick={() => manejarEliminacion(contacto)}
                      disabled={eliminando}
                    >
                      {eliminando && contactoEliminando === contacto.id
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

export default Contacts;