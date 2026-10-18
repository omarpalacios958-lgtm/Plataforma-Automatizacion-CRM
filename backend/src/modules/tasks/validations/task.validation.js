// ============================================
// Archivo: task.validation.js
// Descripción:
// Contiene las validaciones del módulo
// de Tareas.
// ============================================
const PRIORIDADES_VALIDAS = ["Baja", "Media", "Alta"];

const ESTADOS_VALIDOS = [
  "Pendiente",
  "En progreso",
  "Completada",
];

/**
 * Valida los datos necesarios para crear una tarea.
 */
function validarCrear(datos) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    throw new Error("Los datos de la tarea son obligatorios.");
  }

  if (
    datos.titulo === undefined ||
    datos.titulo === null ||
    typeof datos.titulo !== "string" ||
    datos.titulo.trim() === ""
  ) {
    throw new Error("El título es obligatorio.");
  }

  if (datos.titulo.length > 150) {
    throw new Error("El título no puede exceder los 150 caracteres.");
  }

  if (datos.descripcion !== undefined && datos.descripcion !== null) {
    if (typeof datos.descripcion !== "string") {
      throw new Error("La descripción debe ser un texto válido.");
    }

    if (datos.descripcion.length > 500) {
      throw new Error(
        "La descripción no puede exceder los 500 caracteres."
      );
    }
  }

  if (
    datos.prioridad !== undefined &&
    datos.prioridad !== null &&
    !PRIORIDADES_VALIDAS.includes(datos.prioridad)
  ) {
    throw new Error("La prioridad es inválida.");
  }

  if (
    datos.estado !== undefined &&
    datos.estado !== null &&
    !ESTADOS_VALIDOS.includes(datos.estado)
  ) {
    throw new Error("El estado es inválido.");
  }

  validarFechaLimite(datos.fechaLimite);
}

/**
 * Valida los datos permitidos para actualizar una tarea.
 */
function validarActualizar(datos) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    throw new Error("Los datos para actualizar son obligatorios.");
  }

  const campos = Object.keys(datos);

  if (campos.length === 0) {
    throw new Error(
      "Debe proporcionar al menos un dato para actualizar."
    );
  }

  if (datos.titulo !== undefined) {
    if (
      typeof datos.titulo !== "string" ||
      datos.titulo.trim() === ""
    ) {
      throw new Error("El título debe ser un texto válido.");
    }

    if (datos.titulo.length > 150) {
      throw new Error("El título no puede exceder los 150 caracteres.");
    }
  }

  if (datos.descripcion !== undefined && datos.descripcion !== null) {
    if (typeof datos.descripcion !== "string") {
      throw new Error("La descripción debe ser un texto válido.");
    }

    if (datos.descripcion.length > 500) {
      throw new Error(
        "La descripción no puede exceder los 500 caracteres."
      );
    }
  }

  if (
    datos.prioridad !== undefined &&
    datos.prioridad !== null &&
    !PRIORIDADES_VALIDAS.includes(datos.prioridad)
  ) {
    throw new Error("La prioridad es inválida.");
  }

  if (
    datos.estado !== undefined &&
    datos.estado !== null &&
    !ESTADOS_VALIDOS.includes(datos.estado)
  ) {
    throw new Error("El estado es inválido.");
  }

  validarFechaLimite(datos.fechaLimite);
}

/**
 * Valida una fecha límite.
 */
function validarFechaLimite(fecha) {
  if (fecha === undefined || fecha === null) {
    return;
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    throw new Error("La fecha límite no es válida.");
  }
}

module.exports = {
  validarCrear,
  validarActualizar,
};