// ============================================
// Archivo: env.js
// Descripción:
// Carga y centraliza las variables de entorno.
// ============================================


const dotenv = require("dotenv");

// Cargar variables desde el archivo .env
dotenv.config();

module.exports = {
  // Servidor
  PORT: process.env.PORT,

  // Base de datos
  DATABASE_URL: process.env.DATABASE_URL,

  // Autenticación
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,

  // Correo electrónico (SMTP)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER
};
