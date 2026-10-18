// ============================================
// Archivo: seed.js
// Descripción:
// Inserta la información inicial de la base
// de datos del CRM.
// ============================================

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {

    console.log("==================================");
    console.log("Inicializando Seed...");
    console.log("==================================");

    // =====================================
    // Crear Roles
    // =====================================

    const administrador = await prisma.role.upsert({

        where: {
            nombre: "Administrador"
        },

        update: {},

        create: {
            nombre: "Administrador",
            descripcion: "Acceso completo al sistema"
        }

    });

    const vendedor = await prisma.role.upsert({

        where: {
            nombre: "Vendedor"
        },

        update: {},

        create: {
            nombre: "Vendedor",
            descripcion: "Gestión de clientes"
        }

    });

    const usuario = await prisma.role.upsert({

        where: {
            nombre: "Usuario"
        },

        update: {},

        create: {
            nombre: "Usuario",
            descripcion: "Usuario básico"
        }

    });

    console.log("Roles creados correctamente.");

    // =====================================
    // Encriptar contraseña
    // =====================================

    const password = await bcrypt.hash("12345678", 10);

    // =====================================
    // Usuario Administrador
    // =====================================

    await prisma.user.upsert({

        where: {
            correo: "admin@correo.com"
        },

        update: {},

        create: {

            nombre: "Administrador",
            apellido: "General",
            correo: "admin@correo.com",
            password,
            roleId: administrador.id

        }

    });

    // =====================================
    // Usuario Vendedor
    // =====================================

    await prisma.user.upsert({

        where: {
            correo: "juan@correo.com"
        },

        update: {},

        create: {

            nombre: "Juan",
            apellido: "Pérez",
            correo: "juan@correo.com",
            password,
            roleId: vendedor.id

        }

    });

    // =====================================
    // Usuario Básico
    // =====================================

    await prisma.user.upsert({

        where: {
            correo: "usuario@correo.com"
        },

        update: {},

        create: {

            nombre: "Usuario",
            apellido: "Demo",
            correo: "usuario@correo.com",
            password,
            roleId: usuario.id

        }

    });

    console.log("Usuarios creados correctamente.");

    console.log("==================================");
    console.log("Seed finalizado correctamente.");
    console.log("==================================");

}

main()

    .then(async () => {

        await prisma.$disconnect();

    })

    .catch(async (error) => {

        console.error(error);

        await prisma.$disconnect();

        process.exit(1);

    });