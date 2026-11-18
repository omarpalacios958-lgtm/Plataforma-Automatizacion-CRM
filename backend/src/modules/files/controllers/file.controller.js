
const fileService = require("../services/file.service");

function convertirAsociacion(valor) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  return Number(valor);
}

function estadoError(error) {
  const mensaje = error.message || "";

  if (mensaje.includes("permisos")) {
    return 403;
  }

  if (
    mensaje.includes("no fue encontrado") ||
    mensaje.includes("no existe") ||
    mensaje.includes("inactiva")
  ) {
    return 404;
  }

  if (
    mensaje.includes("asociad") ||
    mensaje.includes("entidad") ||
    mensaje.includes("ID") ||
    mensaje.includes("seleccionar")
  ) {
    return 400;
  }

  return 500;
}

function responderError(res, error) {
  const statusCode = estadoError(error);

  if (statusCode === 500) {
    console.error("Error del módulo Archivos:", error);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Error interno del servidor."
        : error.message
  });
}

const obtenerTodos = async (req, res) => {
  try {
    const archivos = await fileService.obtenerTodos(
      req.user
    );

    return res.status(200).json({
      success: true,
      data: archivos
    });
  } catch (error) {
    return responderError(res, error);
  }
};

const obtenerPorId = async (req, res) => {
  try {
    const archivo = await fileService.obtenerPorId(
      Number(req.params.id),
      req.user
    );

    return res.status(200).json({
      success: true,
      data: archivo
    });
  } catch (error) {
    return responderError(res, error);
  }
};

const crear = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Debe seleccionar un archivo."
      });
    }

    const datosArchivo = {
      nombre: req.body.nombre,
      archivo: req.file,
      companyId: convertirAsociacion(
        req.body.companyId
      ),
      contactId: convertirAsociacion(
        req.body.contactId
      ),
      leadId: convertirAsociacion(
        req.body.leadId
      ),
      opportunityId: convertirAsociacion(
        req.body.opportunityId
      )
    };

    const archivo = await fileService.crear(
      datosArchivo,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Archivo subido correctamente.",
      data: archivo
    });
  } catch (error) {
    return responderError(res, error);
  }
};

const actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const datosActualizacion = {};

    if (req.body.nombre !== undefined) {
      datosActualizacion.nombre = req.body.nombre;
    }

    for (const campo of [
      "companyId",
      "contactId",
      "leadId",
      "opportunityId"
    ]) {
      if (req.body[campo] !== undefined) {
        datosActualizacion[campo] =
          convertirAsociacion(req.body[campo]);
      }
    }

    if (req.file) {
      datosActualizacion.archivo = req.file;
    }

    const archivo = await fileService.actualizar(
      id,
      datosActualizacion,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Archivo actualizado correctamente.",
      data: archivo
    });
  } catch (error) {
    return responderError(res, error);
  }
};

const eliminar = async (req, res) => {
  try {
    await fileService.eliminar(
      Number(req.params.id),
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Archivo eliminado correctamente."
    });
  } catch (error) {
    return responderError(res, error);
  }
};


const descargar = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { archivo, contenido } =
      await fileService.descargar(id, req.user);

    const nombreOriginal = archivo.nombreOriginal || "documento";

    // Evitar saltos de línea y caracteres de control
    // en los encabezados HTTP.
    const nombreSeguro = nombreOriginal
      .replace(/[\r\n\x00-\x1f\x7f]/g, "")
      .replace(/[\\/]/g, "_");

    const nombreCodificado = encodeURIComponent(nombreSeguro);

    res.setHeader(
      "Content-Type",
      archivo.tipoMime || "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="documento"; filename*=UTF-8''${nombreCodificado}`
    );

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(contenido);
  } catch (error) {
    const statusCode = estadoError(error);

    if (statusCode === 500) {
      console.error("Error al descargar archivo:", error);
    }

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "No fue posible descargar el documento."
          : error.message
    });
  }
};


module.exports = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  descargar
};
