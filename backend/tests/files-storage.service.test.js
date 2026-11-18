
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// ============================================
// Simulaciones de PostgreSQL y Supabase Storage
// ============================================

let estado;

function nuevoEstado() {
  return {
    subidos: [],
    eliminados: [],
    registros: [],
    fallarCreacion: false,
    fallarActualizacion: false,
    archivoExistente: null
  };
}

function simularModulo(ruta, exportaciones) {
  const id = require.resolve(ruta);

  require.cache[id] = {
    id,
    filename: id,
    loaded: true,
    exports: exportaciones
  };
}

const prismaSimulado = {
  company: {
    findFirst: async () => ({
      id: 1,
      activo: true,
      userId: 7
    })
  },
  contact: {
    findFirst: async () => ({
      id: 2,
      activo: true,
      userId: 7
    })
  },
  lead: {
    findFirst: async () => ({
      id: 3,
      activo: true,
      userId: 7
    })
  },
  opportunity: {
    findFirst: async () => ({
      id: 1,
      activo: true,
      userId: 7
    })
  }
};

const repositorioSimulado = {
  obtenerTodos: async () => estado.registros,

  obtenerPorUsuario: async userId =>
    estado.registros.filter(a => a.userId === userId),

  obtenerPorId: async () => estado.archivoExistente,

  crear: async datos => {
    if (estado.fallarCreacion) {
      throw new Error("ERROR_BD_SIMULADO");
    }

    const archivo = {
      id: 10,
      activo: true,
      ...datos
    };

    estado.registros.push(archivo);
    return archivo;
  },

  actualizar: async (id, datos) => {
    if (estado.fallarActualizacion) {
      throw new Error("ERROR_ACTUALIZACION_SIMULADO");
    }

    return {
      ...estado.archivoExistente,
      ...datos,
      id
    };
  },

  eliminar: async id => ({
    id,
    activo: false
  })
};

const clienteStorageSimulado = {
  storage: {
    from: () => ({
      upload: async (ruta, contenido) => {
        estado.subidos.push({
          ruta,
          contenido
        });

        return { error: null };
      },

      remove: async rutas => {
        estado.eliminados.push(...rutas);

        return { error: null };
      },

      download: async () => ({
        data: new Blob(["CONTENIDO_PRUEBA"], {
          type: "application/pdf"
        }),
        error: null
      })
    })
  }
};

// Inyectar dependencias simuladas antes de
// cargar el servicio que queremos probar.
const moduloFiles = path.resolve(
  __dirname,
  "../src/modules/files"
);

simularModulo(
  path.join(moduloFiles, "repositories/file.repository.js"),
  repositorioSimulado
);

simularModulo(
  path.resolve(__dirname, "../src/config/database.js"),
  prismaSimulado
);

simularModulo(
  path.resolve(__dirname, "../src/config/supabase.js"),
  {
    obtenerClienteSupabase: () => clienteStorageSimulado,
    STORAGE_BUCKET: "crm-documentos"
  }
);

const fileService = require(
  "../src/modules/files/services/file.service"
);

const administrador = {
  id: 7,
  role: "Administrador"
};

const vendedorAjeno = {
  id: 99,
  role: "Vendedor"
};

function documentoPrueba() {
  const buffer = Buffer.from("%PDF-1.4 PRUEBA");

  return {
    originalname: "prueba.pdf",
    mimetype: "application/pdf",
    size: buffer.length,
    buffer
  };
}

test.beforeEach(() => {
  estado = nuevoEstado();
});

// ============================================
// Prueba 1: creación satisfactoria
// ============================================

test("Files: sube documento y registra metadatos", async () => {
  const resultado = await fileService.crear(
    {
      nombre: "Propuesta PepsiCo",
      opportunityId: 1,
      archivo: documentoPrueba()
    },
    administrador
  );

  assert.equal(estado.subidos.length, 1);
  assert.equal(estado.registros.length, 1);

  assert.match(
    resultado.ruta,
    /^opportunities\/.+\.pdf$/
  );

  assert.equal(resultado.opportunityId, 1);
  assert.equal(resultado.userId, 7);
  assert.equal(resultado.tipoMime, "application/pdf");
});

// ============================================
// Prueba 2: autorización
// ============================================

test("Files: impide subir a entidad ajena", async () => {
  await assert.rejects(
    () =>
      fileService.crear(
        {
          nombre: "Documento no autorizado",
          opportunityId: 1,
          archivo: documentoPrueba()
        },
        vendedorAjeno
      ),
    /permisos/
  );

  assert.equal(estado.subidos.length, 0);
  assert.equal(estado.registros.length, 0);
});

// ============================================
// Prueba 3: rollback ante fallo de PostgreSQL
// ============================================

test("Files: limpia Storage cuando falla la BD", async () => {
  estado.fallarCreacion = true;

  await assert.rejects(
    () =>
      fileService.crear(
        {
          nombre: "Documento de prueba",
          opportunityId: 1,
          archivo: documentoPrueba()
        },
        administrador
      ),
    /ERROR_BD_SIMULADO/
  );

  assert.equal(estado.subidos.length, 1);
  assert.equal(estado.eliminados.length, 1);

  assert.equal(
    estado.eliminados[0],
    estado.subidos[0].ruta
  );
});

// ============================================
// Prueba 4: reemplazo satisfactorio
// ============================================

test("Files: reemplaza documento y limpia el anterior", async () => {
  estado.archivoExistente = {
    id: 10,
    activo: true,
    userId: 7,
    opportunityId: 1,
    companyId: null,
    contactId: null,
    leadId: null,
    ruta: "opportunities/documento-anterior.pdf"
  };

  const resultado = await fileService.actualizar(
    10,
    {
      archivo: documentoPrueba()
    },
    administrador
  );

  assert.equal(estado.subidos.length, 1);

  assert.equal(
    estado.eliminados[0],
    "opportunities/documento-anterior.pdf"
  );

  assert.notEqual(
    resultado.ruta,
    estado.archivoExistente.ruta
  );
});

// ============================================
// Prueba 5: descarga autorizada
// ============================================

test("Files: descarga documento autorizado", async () => {
  estado.archivoExistente = {
    id: 10,
    activo: true,
    userId: 7,
    ruta: "opportunities/prueba.pdf",
    nombreOriginal: "prueba.pdf",
    tipoMime: "application/pdf"
  };

  const resultado = await fileService.descargar(
    10,
    administrador
  );

  assert.equal(resultado.archivo.id, 10);

  assert.equal(
    resultado.contenido.toString(),
    "CONTENIDO_PRUEBA"
  );
});

// ============================================
// Prueba 6: descarga no autorizada
// ============================================

test("Files: rechaza descarga de usuario ajeno", async () => {
  estado.archivoExistente = {
    id: 10,
    activo: true,
    userId: 7,
    ruta: "opportunities/prueba.pdf"
  };

  await assert.rejects(
    () => fileService.descargar(10, vendedorAjeno),
    /permisos/
  );
});

// ============================================
// Prueba 7: eliminación lógica
// ============================================

test("Files: conserva eliminación lógica", async () => {
  estado.archivoExistente = {
    id: 10,
    activo: true,
    userId: 7,
    ruta: "opportunities/prueba.pdf"
  };

  const resultado = await fileService.eliminar(
    10,
    administrador
  );

  assert.equal(resultado.activo, false);
  assert.equal(estado.eliminados.length, 0);
});


test(
  "Files: conserva archivo anterior si falla la actualización",
  async () => {
    estado.archivoExistente = {
      id: 10,
      activo: true,
      userId: 7,
      opportunityId: 1,
      companyId: null,
      contactId: null,
      leadId: null,
      ruta: "opportunities/documento-original.pdf"
    };

    estado.fallarActualizacion = true;

    await assert.rejects(
      () =>
        fileService.actualizar(
          10,
          {
            archivo: documentoPrueba()
          },
          administrador
        ),
      /ERROR_ACTUALIZACION_SIMULADO/
    );

    // Se intentó subir el reemplazo.
    assert.equal(estado.subidos.length, 1);

    // Se eliminó el archivo nuevo tras fallar PostgreSQL.
    assert.equal(estado.eliminados.length, 1);

    assert.equal(
      estado.eliminados[0],
      estado.subidos[0].ruta
    );

    // Nunca se elimina el documento original.
    assert.notEqual(
      estado.eliminados[0],
      estado.archivoExistente.ruta
    );
  }
);
