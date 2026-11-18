
const crypto = require("node:crypto");
const path = require("node:path");

const fileRepository = require("../repositories/file.repository");
const prisma = require("../../../config/database");

const {
  obtenerClienteSupabase,
  STORAGE_BUCKET
} = require("../../../config/supabase");

const ENTIDADES = {
  companyId: {
    modelo: "company",
    carpeta: "companies",
    nombre: "empresa"
  },
  contactId: {
    modelo: "contact",
    carpeta: "contacts",
    nombre: "contacto"
  },
  leadId: {
    modelo: "lead",
    carpeta: "leads",
    nombre: "lead"
  },
  opportunityId: {
    modelo: "opportunity",
    carpeta: "opportunities",
    nombre: "oportunidad"
  }
};

const CAMPOS_ASOCIACION = Object.keys(ENTIDADES);

function obtenerAsociacion(datos) {
  const presentes = CAMPOS_ASOCIACION.filter(
    campo =>
      datos[campo] !== undefined &&
      datos[campo] !== null
  );

  if (presentes.length !== 1) {
    throw new Error(
      "El archivo debe estar asociado exactamente a una entidad."
    );
  }

  const campo = presentes[0];
  const id = Number(datos[campo]);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("El ID de la entidad no es válido.");
  }

  return {
    campo,
    id,
    ...ENTIDADES[campo]
  };
}

function esRutaStorage(ruta) {
  return (
    typeof ruta === "string" &&
    /^(companies|contacts|leads|opportunities)\//.test(ruta) &&
    !ruta.includes("..") &&
    !ruta.includes("\\")
  );
}

async function subirArchivo(archivo, carpeta) {
  if (!archivo || !Buffer.isBuffer(archivo.buffer)) {
    throw new Error("Debe seleccionar un archivo válido.");
  }

  const extension = path
    .extname(archivo.originalname)
    .toLowerCase();

  const ruta = `${carpeta}/${crypto.randomUUID()}${extension}`;

  const { error } = await obtenerClienteSupabase()
    .storage
    .from(STORAGE_BUCKET)
    .upload(ruta, archivo.buffer, {
      contentType: archivo.mimetype,
      upsert: false,
      cacheControl: "3600"
    });

  if (error) {
    console.error("Error al subir archivo a Storage:", error);
    throw new Error(
      "No se pudo almacenar el documento en Supabase Storage."
    );
  }

  return ruta;
}

async function eliminarArchivoStorage(ruta) {
  if (!esRutaStorage(ruta)) {
    return;
  }

  const { error } = await obtenerClienteSupabase()
    .storage
    .from(STORAGE_BUCKET)
    .remove([ruta]);

  if (error) {
    throw error;
  }
}

async function limpiarArchivoStorage(ruta, contexto) {
  try {
    await eliminarArchivoStorage(ruta);
  } catch (error) {
    console.error(
      `Error de limpieza de Storage (${contexto}):`,
      error
    );
  }
}

class FileService {
  async obtenerTodos(usuario) {
    if (usuario.role === "Administrador") {
      return fileRepository.obtenerTodos();
    }

    return fileRepository.obtenerPorUsuario(usuario.id);
  }

  async obtenerPorId(id, usuario) {
    const archivo = await fileRepository.obtenerPorId(id);

    if (!archivo) {
      throw new Error("El archivo no fue encontrado.");
    }

    if (
      usuario.role !== "Administrador" &&
      archivo.userId !== usuario.id
    ) {
      throw new Error(
        "No tiene permisos para acceder a este archivo."
      );
    }

    return archivo;
  }

  async validarAsociacionPropiedad(datos, usuario) {
    const asociacion = obtenerAsociacion(datos);

    const entidad = await prisma[
      asociacion.modelo
    ].findFirst({
      where: {
        id: asociacion.id,
        activo: true
      }
    });

    if (!entidad) {
      throw new Error(
        `La ${asociacion.nombre} asociada no existe o está inactiva.`
      );
    }

    if (
      usuario.role !== "Administrador" &&
      entidad.userId !== usuario.id
    ) {
      throw new Error(
        "No tiene permisos para asociar el archivo a esta entidad."
      );
    }

    return asociacion;
  }

  async crear(datos, usuario) {
    // Validar la asociación antes de enviar el archivo.
    const asociacion = await this.validarAsociacionPropiedad(
      datos,
      usuario
    );

    if (!datos.archivo) {
      throw new Error("Debe seleccionar un archivo.");
    }

    const ruta = await subirArchivo(
      datos.archivo,
      asociacion.carpeta
    );

    const datosPermitidos = {
      nombre: datos.nombre,
      nombreOriginal: datos.archivo.originalname,
      ruta,
      tipoMime: datos.archivo.mimetype,
      extension: path
        .extname(datos.archivo.originalname)
        .replace(".", "")
        .toLowerCase(),
      tamano: datos.archivo.size,
      userId: usuario.id,
      companyId: datos.companyId ?? null,
      contactId: datos.contactId ?? null,
      leadId: datos.leadId ?? null,
      opportunityId: datos.opportunityId ?? null
    };

    try {
      return await fileRepository.crear(datosPermitidos);
    } catch (error) {
      await limpiarArchivoStorage(
        ruta,
        "fallo al registrar el archivo"
      );

      throw error;
    }
  }

  async actualizar(id, datos, usuario) {
    // Validar propiedad del registro antes de reemplazar.
    const archivoExistente = await this.obtenerPorId(
      id,
      usuario
    );

    const asociacionEnviada = CAMPOS_ASOCIACION.some(
      campo => datos[campo] !== undefined
    );

    let nuevaAsociacion = null;

    if (asociacionEnviada) {
      const asociaciones = {};

      for (const campo of CAMPOS_ASOCIACION) {
        asociaciones[campo] = datos[campo] ?? null;
      }

      nuevaAsociacion =
        await this.validarAsociacionPropiedad(
          asociaciones,
          usuario
        );
    }

    const datosPermitidos = {};

    if (datos.nombre !== undefined) {
      datosPermitidos.nombre = datos.nombre;
    }

    if (asociacionEnviada) {
      for (const campo of CAMPOS_ASOCIACION) {
        datosPermitidos[campo] =
          datos[campo] ?? null;
      }
    }

    let rutaNueva = null;

    if (datos.archivo) {
      let carpeta;

      if (nuevaAsociacion) {
        carpeta = nuevaAsociacion.carpeta;
      } else {
        const asociacionExistente =
          obtenerAsociacion(archivoExistente);

        carpeta = asociacionExistente.carpeta;
      }

      rutaNueva = await subirArchivo(
        datos.archivo,
        carpeta
      );

      datosPermitidos.ruta = rutaNueva;
      datosPermitidos.nombreOriginal =
        datos.archivo.originalname;
      datosPermitidos.tipoMime =
        datos.archivo.mimetype;
      datosPermitidos.extension = path
        .extname(datos.archivo.originalname)
        .replace(".", "")
        .toLowerCase();
      datosPermitidos.tamano = datos.archivo.size;
    }

    let archivoActualizado;

    try {
      archivoActualizado =
        await fileRepository.actualizar(
          id,
          datosPermitidos
        );
    } catch (error) {
      if (rutaNueva) {
        await limpiarArchivoStorage(
          rutaNueva,
          "fallo al actualizar el archivo"
        );
      }

      throw error;
    }

    // Solo eliminar el objeto anterior después de que
    // PostgreSQL haya confirmado la actualización.
    if (
      rutaNueva &&
      archivoExistente.ruta !== rutaNueva
    ) {
      await limpiarArchivoStorage(
        archivoExistente.ruta,
        "reemplazo de archivo anterior"
      );
    }

    return archivoActualizado;
  }


async descargar(id, usuario) {
  const archivo = await this.obtenerPorId(id, usuario);

  if (!esRutaStorage(archivo.ruta)) {
    throw new Error(
      "El documento no está disponible en Supabase Storage."
    );
  }

  const { data, error } = await obtenerClienteSupabase()
    .storage
    .from(STORAGE_BUCKET)
    .download(archivo.ruta);

  if (error || !data) {
    console.error("Error de descarga en Storage:", error);

    throw new Error(
      "No fue posible recuperar el documento."
    );
  }

  const contenido = Buffer.from(
    await data.arrayBuffer()
  );

  return {
    archivo,
    contenido
  };
}


  async eliminar(id, usuario) {
    await this.obtenerPorId(id, usuario);

    // Conservamos la eliminación lógica existente.
    // No eliminamos el objeto de Storage en esta fase.
    return fileRepository.eliminar(id);
  }
}

module.exports = new FileService();
