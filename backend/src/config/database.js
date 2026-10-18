// ============================================
// Archivo: database.js
// Descripción:
// Configuración del cliente de Prisma.
// Se encarga de administrar la conexión con
// la base de datos PostgreSQL.
// ============================================

const { PrismaClient } = require("@prisma/client");

// Crear una única instancia de Prisma
const prisma = new PrismaClient();

// Exportar la instancia
module.exports = prisma;