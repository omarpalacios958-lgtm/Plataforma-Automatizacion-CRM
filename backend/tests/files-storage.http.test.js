
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const originales = new Map();

function simularModulo(ruta, exportaciones) {
  const id = require.resolve(ruta);
  originales.set(id, require.cache[id]);

  require.cache[id] = {
    id,
    filename: id,
    loaded: true,
    exports: exportaciones
  };
}

const estado = {
  creaciones: [],
  actualizaciones: [],
  descargas: [],
  eliminaciones: []
};

function reiniciar() {
  estado.creaciones = [];
  estado.actualizaciones = [];
  estado.descargas = [];
  estado.eliminaciones = [];
}

// Simulación de Prisma para los middlewares.
const entidad = {
  id: 1,
  activo: true,
  userId: 7
};

const prismaSimulado = {
  company: {
    findFirst: async () => entidad
  },
  contact: {
    findFirst: async () => entidad
  },
  lead: {
    findFirst: async () => entidad
  },
  opportunity: {
    findFirst: async () => entidad
  },
  file: {
    findFirst: async () => ({
      id: 10,
      activo: true,
      userId: 7,
      opportunityId: 1
    })
  }
};

// Autenticación simulada.
// No se utiliza un JWT real en estas pruebas.
function autenticacionSimulada(req, res, next) {
  const token = req.headers.authorization;

  if (token === "Bearer administrador") {
    req.user = {
      id: 7,
      role: "Administrador"
    };
    return next();
  }

  if (token === "Bearer vendedor") {
    req.user = {
      id: 8,
      role: "Vendedor"
    };
    return next();
  }

  if (token === "Bearer usuario") {
    req.user = {
      id: 9,
      role: "Usuario"
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: "No autorizado."
  });
}

function rolesSimulados(...permitidos) {
  return (req, res, next) => {
    if (!permitidos.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Sin permisos."
      });
    }

    next();
  };
}

const servicioSimulado = {
  async obtenerTodos() {
    return [];
  },

  async obtenerPorId(id) {
    return { id, nombre: "Documento de prueba" };
  },

  async crear(datos, usuario) {
    estado.creaciones.push({ datos, usuario });

    return {
      id: 10,
      nombre: datos.nombre,
      ruta: "opportunities/prueba.pdf",
      userId: usuario.id,
      opportunityId: datos.opportunityId
    };
  },

  async actualizar(id, datos, usuario) {
    estado.actualizaciones.push({
      id,
      datos,
      usuario
    });

    return {
      id,
      nombre: datos.nombre || "Documento actualizado"
    };
  },

  async descargar(id, usuario) {
    estado.descargas.push({ id, usuario });

    return {
      archivo: {
        id,
        nombreOriginal: "propuesta.pdf",
        tipoMime: "application/pdf"
      },
      contenido: Buffer.from("PDF_SIMULADO")
    };
  },

  async eliminar(id) {
    estado.eliminaciones.push(id);
    return { id, activo: false };
  }
};

simularModulo(
  "../src/config/database",
  prismaSimulado
);

simularModulo(
  "../src/modules/files/services/file.service",
  servicioSimulado
);

simularModulo(
  "../src/modules/auth/middlewares/auth.middleware",
  autenticacionSimulada
);

simularModulo(
  "../src/modules/auth/middlewares/role.middleware",
  rolesSimulados
);

const rutas = require(
  "../src/modules/files/routes/file.routes"
);

const app = express();

app.use(express.json());
app.use("/api/files", rutas);

// Captura errores inesperados de Express.
app.use((error, req, res, next) => {
  console.error("Error HTTP de prueba:", error.message);

  return res.status(500).json({
    success: false,
    message: "Error interno del servidor."
  });
});

let servidor;
let baseUrl;

test.before(async () => {
  servidor = http.createServer(app);

  await new Promise(resolve => {
    servidor.listen(0, "127.0.0.1", resolve);
  });

  const puerto = servidor.address().port;
  baseUrl = `http://127.0.0.1:${puerto}`;
});

test.beforeEach(reiniciar);

test.after(async () => {
  if (servidor) {
    await new Promise((resolve, reject) => {
      servidor.close(error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  for (const [id, original] of originales) {
    if (original) {
      require.cache[id] = original;
    } else {
      delete require.cache[id];
    }
  }
});

function formulario({
  nombre = "Propuesta PepsiCo",
  asociacion = "opportunityId",
  id = "1",
  tipo = "application/pdf",
  archivo = "prueba.pdf",
  incluirArchivo = true,
  contenido = "%PDF-1.4 PRUEBA"
} = {}) {
  const form = new FormData();

  form.append("nombre", nombre);
  form.append(asociacion, id);

  if (incluirArchivo) {
    form.append(
      "archivo",
      new Blob([contenido], { type: tipo }),
      archivo
    );
  }

  return form;
}

function autorizacion(token = "administrador") {
  return {
    Authorization: `Bearer ${token}`
  };
}

test(
  "Files HTTP: rechaza solicitud sin autenticación",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/opportunities`,
      {
        method: "POST",
        body: formulario()
      }
    );

    assert.equal(respuesta.status, 401);
    assert.equal(estado.creaciones.length, 0);
  }
);

test(
  "Files HTTP: rechaza rol no autorizado",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/opportunities`,
      {
        method: "POST",
        headers: autorizacion("usuario"),
        body: formulario()
      }
    );

    assert.equal(respuesta.status, 403);
    assert.equal(estado.creaciones.length, 0);
  }
);

test(
  "Files HTTP: crea documento PDF válido",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/opportunities`,
      {
        method: "POST",
        headers: autorizacion(),
        body: formulario()
      }
    );

    const resultado = await respuesta.json();

    assert.equal(respuesta.status, 201);
    assert.equal(resultado.success, true);
    assert.equal(estado.creaciones.length, 1);

    const datos = estado.creaciones[0].datos;

    assert.equal(datos.opportunityId, 1);
    assert.equal(datos.archivo.originalname, "prueba.pdf");
    assert.ok(Buffer.isBuffer(datos.archivo.buffer));
  }
);

test(
  "Files HTTP: rechaza asociación distinta a la URL",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/opportunities`,
      {
        method: "POST",
        headers: autorizacion(),
        body: formulario({
          asociacion: "companyId"
        })
      }
    );

    assert.equal(respuesta.status, 400);
    assert.equal(estado.creaciones.length, 0);
  }
);

test(
  "Files HTTP: rechaza extensión no permitida",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/opportunities`,
      {
        method: "POST",
        headers: autorizacion(),
        body: formulario({
          archivo: "programa.exe",
          tipo: "application/octet-stream"
        })
      }
    );

    assert.equal(respuesta.status, 400);
    assert.equal(estado.creaciones.length, 0);
  }
);

test(
  "Files HTTP: rechaza archivos mayores de 10 MB",
  async () => {
    const contenido = Buffer.alloc(
      10 * 1024 * 1024 + 1,
      65
    );

    const respuesta = await fetch(
      `${baseUrl}/api/files/opportunities`,
      {
        method: "POST",
        headers: autorizacion(),
        body: formulario({ contenido })
      }
    );

    assert.equal(respuesta.status, 400);
    assert.equal(estado.creaciones.length, 0);
  }
);

test(
  "Files HTTP: rechaza creación sin archivo",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/opportunities`,
      {
        method: "POST",
        headers: autorizacion(),
        body: formulario({
          incluirArchivo: false
        })
      }
    );

    assert.equal(respuesta.status, 400);
    assert.equal(estado.creaciones.length, 0);
  }
);

test(
  "Files HTTP: rechaza ID de archivo inválido",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/abc/download`,
      {
        headers: autorizacion()
      }
    );

    assert.equal(respuesta.status, 400);
    assert.equal(estado.descargas.length, 0);
  }
);

test(
  "Files HTTP: descarga documento autorizado",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/10/download`,
      {
        headers: autorizacion()
      }
    );

    assert.equal(respuesta.status, 200);

    assert.equal(
      respuesta.headers.get("content-type"),
      "application/pdf"
    );

    assert.equal(
      await respuesta.text(),
      "PDF_SIMULADO"
    );

    assert.equal(estado.descargas.length, 1);
    assert.equal(estado.descargas[0].id, 10);
  }
);

test(
  "Files HTTP: actualiza documento existente",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/10`,
      {
        method: "PUT",
        headers: autorizacion(),
        body: formulario({
          nombre: "Propuesta actualizada"
        })
      }
    );

    assert.equal(respuesta.status, 200);
    assert.equal(estado.actualizaciones.length, 1);

    assert.ok(
      Buffer.isBuffer(
        estado.actualizaciones[0].datos.archivo.buffer
      )
    );
  }
);

test(
  "Files HTTP: elimina lógicamente mediante ruta",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/10`,
      {
        method: "DELETE",
        headers: autorizacion()
      }
    );

    assert.equal(respuesta.status, 200);
    assert.deepEqual(estado.eliminaciones, [10]);
  }
);


test(
  "Files HTTP: rechaza extensión y MIME incompatibles",
  async () => {
    const respuesta = await fetch(
      `${baseUrl}/api/files/opportunities`,
      {
        method: "POST",
        headers: autorizacion(),
        body: formulario({
          archivo: "propuesta.pdf",
          tipo: "image/png"
        })
      }
    );

    assert.equal(respuesta.status, 400);
    assert.equal(estado.creaciones.length, 0);
  }
);
