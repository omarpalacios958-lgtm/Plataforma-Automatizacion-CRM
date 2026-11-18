
"use strict";

// ============================================
// Archivo: multer.js
// Descripción:
// Configuración de recepción temporal de
// archivos para Supabase Storage.
// ============================================

const multer = require("multer");
const path = require("node:path");

// Entidades permitidas
const allowedEntities = new Set([
  "companies",
  "contacts",
  "leads",
  "opportunities"
]);

// Relación exacta extensión - tipo MIME
const allowedFileTypes = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

// Almacenamiento temporal en memoria.
// El almacenamiento definitivo corresponde
// al servicio de Supabase Storage.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const entity = req.fileEntity || req.params?.entity;

  // Validar la entidad correspondiente
  if (!allowedEntities.has(entity)) {
    const error = new Error(
      "Entidad no válida para almacenar archivos."
    );

    error.code = "INVALID_FILE_ENTITY";

    return cb(error);
  }

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const mimeType = file.mimetype;

  const expectedMimeType = allowedFileTypes[extension];

  // La extensión y su tipo MIME deben coincidir
  if (!expectedMimeType || mimeType !== expectedMimeType) {
    const error = new Error(
      "Tipo de archivo no permitido o extensión incompatible con el tipo MIME."
    );

    error.code = "INVALID_FILE_TYPE";

    return cb(error);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

module.exports = upload;
