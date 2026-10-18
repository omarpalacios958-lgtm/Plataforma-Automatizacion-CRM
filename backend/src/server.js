// ============================================
// Archivo: server.js
// Descripción:
// Punto de entrada del servidor.
// Verifica la conexión con PostgreSQL antes
// de iniciar Express.
// ============================================

const app = require("./app");
const env = require("./config/env");
const prisma = require("./config/database");
const automationSchedulerService = require("./modules/automations/services/automation-scheduler.service");


// Función principal para iniciar el servidor
async function startServer() {

    try {

        // Verificar conexión con PostgreSQL
        await prisma.$connect();

        console.log("===================================");
        console.log("Conexión exitosa a PostgreSQL");
        console.log("===================================");

        // Iniciar servidor
        app.listen(env.PORT, () => {

            console.log("===================================");
            console.log("Servidor iniciado correctamente");
            console.log(`Puerto: ${env.PORT}`);
            console.log(`http://localhost:${env.PORT}`);
            console.log("===================================");

            automationSchedulerService.iniciar();

        });

    } catch (error) {

        console.error("===================================");
        console.error("Error al conectar con PostgreSQL");
        console.error(error);
        console.error("===================================");

        process.exit(1);

    }

}

// Ejecutar aplicación
startServer();