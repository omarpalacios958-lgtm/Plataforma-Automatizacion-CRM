
const EVENTOS_PERMITIDOS = [
  "LEAD_CREADO",
  "SEGUIMIENTO_VENCIDO",
];

const ACCIONES_PERMITIDAS = [
  "CREAR_TAREA",
  "CREAR_NOTIFICACION",
  "ENVIAR_CORREO",
];

const PRIORIDADES_PERMITIDAS = ["Baja", "Media", "Alta"];

const ESTADOS_TAREA_PERMITIDOS = [
  "Pendiente",
  "En progreso",
  "Completada",
];

const CAMPOS_AUTOMATIZACION = [
  "nombre",
  "descripcion",
  "evento",
  "activa",
  "acciones",
];

class AutomationValidation {
  esObjetoValido(datos) {
    return (
      datos !== null &&
      typeof datos === "object" &&
      !Array.isArray(datos)
    );
  }

  validarCamposPermitidos(datos, camposPermitidos) {
    const camposDesconocidos = Object.keys(datos).filter(
      (campo) => !camposPermitidos.includes(campo),
    );

    if (camposDesconocidos.length > 0) {
      throw new Error(
        `Campos no permitidos: ${camposDesconocidos.join(", ")}.`,
      );
    }
  }

  validarNombre(nombre) {
    if (
      typeof nombre !== "string" ||
      nombre.trim().length === 0
    ) {
      throw new Error("El nombre de la automatización es obligatorio.");
    }

    if (nombre.trim().length > 150) {
      throw new Error(
        "El nombre de la automatización no puede superar los 150 caracteres.",
      );
    }
  }

  validarDescripcion(descripcion) {
    if (descripcion === undefined || descripcion === null) {
      return;
    }

    if (typeof descripcion !== "string") {
      throw new Error("La descripción debe ser una cadena de texto.");
    }

    if (descripcion.length > 500) {
      throw new Error(
        "La descripción no puede superar los 500 caracteres.",
      );
    }
  }

  validarEvento(evento) {
    if (!EVENTOS_PERMITIDOS.includes(evento)) {
      throw new Error("El evento de la automatización no es válido.");
    }
  }

  validarActiva(activa) {
    if (typeof activa !== "boolean") {
      throw new Error("El campo activa debe ser booleano.");
    }
  }

  validarAcciones(acciones) {
    if (!Array.isArray(acciones) || acciones.length === 0) {
      throw new Error(
        "Las acciones deben ser un arreglo con al menos una acción.",
      );
    }

    acciones.forEach((accion, index) => {
      if (!this.esObjetoValido(accion)) {
        throw new Error(
          `La acción ${index + 1} debe ser un objeto válido.`,
        );
      }

      if (!ACCIONES_PERMITIDAS.includes(accion.tipo)) {
        throw new Error(
          `El tipo de acción de la posición ${index + 1} no es válido.`,
        );
      }

      if (!this.esObjetoValido(accion.configuracion)) {
        throw new Error(
          `La configuración de la acción ${index + 1} debe ser un objeto válido.`,
        );
      }

      if (
        accion.activa !== undefined &&
        typeof accion.activa !== "boolean"
      ) {
        throw new Error(
          `El campo activa de la acción ${index + 1} debe ser booleano.`,
        );
      }

      if (
        accion.orden !== undefined &&
        (!Number.isInteger(accion.orden) || accion.orden < 1)
      ) {
        throw new Error(
          `El orden de la acción ${index + 1} debe ser un entero positivo.`,
        );
      }

      this.validarConfiguracionAccion(accion);
    });
  }

  validarConfiguracionAccion(accion) {
    const { tipo, configuracion } = accion;

    switch (tipo) {
      case "CREAR_TAREA":
        this.validarConfiguracionTarea(configuracion);
        break;

      case "CREAR_NOTIFICACION":
        this.validarConfiguracionNotificacion(configuracion);
        break;

      case "ENVIAR_CORREO":
        this.validarConfiguracionCorreo(configuracion);
        break;

      default:
        throw new Error("El tipo de acción no está permitido.");
    }
  }

  validarTextoObligatorio(valor, campo, longitudMaxima) {
    if (typeof valor !== "string" || valor.trim().length === 0) {
      throw new Error(`${campo} es obligatorio.`);
    }

    if (valor.trim().length > longitudMaxima) {
      throw new Error(
        `${campo} no puede superar los ${longitudMaxima} caracteres.`,
      );
    }
  }

  validarConfiguracionTarea(configuracion) {
    this.validarTextoObligatorio(
      configuracion.titulo,
      "El título de la tarea",
      150,
    );

    const { descripcion, prioridad, estado, fechaLimite } =
      configuracion;

    if (descripcion !== undefined && descripcion !== null) {
      if (typeof descripcion !== "string") {
        throw new Error(
          "La descripción de la tarea debe ser una cadena de texto.",
        );
      }

      if (descripcion.length > 500) {
        throw new Error(
          "La descripción de la tarea no puede superar los 500 caracteres.",
        );
      }
    }

    if (
      prioridad !== undefined &&
      prioridad !== null &&
      !PRIORIDADES_PERMITIDAS.includes(prioridad)
    ) {
      throw new Error("La prioridad de la tarea no es válida.");
    }

    if (
      estado !== undefined &&
      estado !== null &&
      !ESTADOS_TAREA_PERMITIDOS.includes(estado)
    ) {
      throw new Error("El estado de la tarea no es válido.");
    }

    if (fechaLimite !== undefined && fechaLimite !== null) {
      if (
        typeof fechaLimite !== "string" ||
        fechaLimite.trim().length === 0 ||
        Number.isNaN(Date.parse(fechaLimite))
      ) {
        throw new Error("La fecha límite de la tarea no es válida.");
      }
    }
  }

  validarConfiguracionNotificacion(configuracion) {
    this.validarTextoObligatorio(
      configuracion.titulo,
      "El título de la notificación",
      150,
    );

    this.validarTextoObligatorio(
      configuracion.mensaje,
      "El mensaje de la notificación",
      500,
    );

    this.validarTextoObligatorio(
      configuracion.tipo,
      "El tipo de notificación",
      50,
    );
  }

  validarConfiguracionCorreo(configuracion) {
    const { destinatario, asunto, mensaje } = configuracion;

    this.validarTextoObligatorio(
      destinatario,
      "El destinatario del correo",
      254,
    );

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      destinatario.trim(),
    );

    if (!correoValido) {
      throw new Error("El destinatario debe ser un correo electrónico válido.");
    }

    this.validarTextoObligatorio(asunto, "El asunto del correo", 200);

    this.validarTextoObligatorio(
      mensaje,
      "El mensaje del correo",
      10000,
    );
  }

  validarCrear(datos) {
    if (!this.esObjetoValido(datos)) {
      throw new Error("Los datos de la automatización no son válidos.");
    }

    this.validarCamposPermitidos(datos, CAMPOS_AUTOMATIZACION);
    this.validarNombre(datos.nombre);
    this.validarEvento(datos.evento);

    if (datos.descripcion !== undefined) {
      this.validarDescripcion(datos.descripcion);
    }

    if (datos.activa !== undefined) {
      this.validarActiva(datos.activa);
    }

    if (datos.acciones !== undefined) {
      this.validarAcciones(datos.acciones);
    }

    return true;
  }

  validarActualizar(datos) {
    if (!this.esObjetoValido(datos)) {
      throw new Error("Los datos de actualización no son válidos.");
    }

    this.validarCamposPermitidos(datos, CAMPOS_AUTOMATIZACION);

    if (Object.keys(datos).length === 0) {
      throw new Error(
        "Debe proporcionar al menos un campo para actualizar.",
      );
    }

    if (Object.hasOwn(datos, "nombre")) {
      this.validarNombre(datos.nombre);
    }

    if (Object.hasOwn(datos, "descripcion")) {
      this.validarDescripcion(datos.descripcion);
    }

    if (Object.hasOwn(datos, "evento")) {
      this.validarEvento(datos.evento);
    }

    if (Object.hasOwn(datos, "activa")) {
      this.validarActiva(datos.activa);
    }

    if (Object.hasOwn(datos, "acciones")) {
      this.validarAcciones(datos.acciones);
    }

    return true;
  }
}

module.exports = new AutomationValidation();
