
'use strict';

require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');

const TEST_DATABASE = 'crm_chat_integration_test';
const PRODUCTION_DATABASE = 'crm_automatizacion';

function getTestDatabaseUrl() {
  const originalUrl = process.env.DATABASE_URL;

  if (!originalUrl) {
    throw new Error('DATABASE_URL no esta configurada.');
  }

  const url = new URL(originalUrl);

  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL no utiliza PostgreSQL.');
  }

  const currentDatabase = decodeURIComponent(
    url.pathname.replace(/^\/+/, '')
  );

  if (currentDatabase !== PRODUCTION_DATABASE) {
    throw new Error(
      'La base de origen no coincide con la esperada.'
    );
  }

  url.pathname = `/${TEST_DATABASE}`;

  return url.toString();
}

function createTestPrisma() {
  return new PrismaClient({
    datasources: {
      db: {
        url: getTestDatabaseUrl(),
      },
    },
  });
}

async function verifyTestDatabase(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT current_database() AS database_name
  `;

  const actualDatabase = rows[0]?.database_name;

  if (actualDatabase !== TEST_DATABASE) {
    throw new Error(
      `Conexion insegura: base inesperada ${actualDatabase}`
    );
  }

  return actualDatabase;
}

module.exports = {
  TEST_DATABASE,
  getTestDatabaseUrl,
  createTestPrisma,
  verifyTestDatabase,
};
