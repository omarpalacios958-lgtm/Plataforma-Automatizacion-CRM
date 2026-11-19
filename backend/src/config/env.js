
const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  // Servidor
  PORT: Number(process.env.PORT || 3000),

  // Base de datos
  DATABASE_URL: process.env.DATABASE_URL,

  // Autenticación
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,

  // Proveedor de correo
  EMAIL_PROVIDER:
    (process.env.EMAIL_PROVIDER || "smtp").toLowerCase(),

  // SMTP
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER,

  // Resend
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM,

  // Supabase Storage
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET:
    process.env.SUPABASE_STORAGE_BUCKET || "crm-documentos"
};
