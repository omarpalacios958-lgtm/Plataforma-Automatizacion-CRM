// ============================================
// Archivo: dashboard.repository.js
// Descripción:
// Repositorio encargado de consultar los
// indicadores del Dashboard.
// Las consultas se realizan mediante Prisma ORM
// y respetan el alcance del usuario autenticado.
// ============================================

const prisma = require("../../../config/database");

// ============================================
// Obtener estadísticas
// ============================================

const obtenerEstadisticas = async (usuario) => {

    const esAdministrador =
        usuario.role === "Administrador";

    const filtroPropietario = esAdministrador
        ? {}
        : { userId: usuario.id };

    const [
        usuarios,
        contactos,
        leads,
        oportunidades,
        montoTotal,
        actividadesPendientes,
        actividadesCompletadas,
        tareasPendientes,
        tareasEnProgreso,
        tareasCompletadas,
        notificacionesSinLeer
    ] = await Promise.all([

        // ========================================
        // Usuarios
        // Siempre se muestra el total global
        // de usuarios activos.
        // ========================================

        prisma.user.count({
            where: {
                activo: true
            }
        }),

        // ========================================
        // Contactos
        // ========================================

        prisma.contact.count({
            where: {
                activo: true,
                ...filtroPropietario
            }
        }),

        // ========================================
        // Leads
        // ========================================

        prisma.lead.count({
            where: {
                activo: true,
                ...filtroPropietario
            }
        }),

        // ========================================
        // Oportunidades
        // ========================================

        prisma.opportunity.count({
            where: {
                activo: true,
                ...filtroPropietario
            }
        }),

        // ========================================
        // Monto total de oportunidades
        // ========================================

        prisma.opportunity.aggregate({
            where: {
                activo: true,
                ...filtroPropietario
            },
            _sum: {
                monto: true
            }
        }),

        // ========================================
        // Actividades pendientes
        // ========================================

        prisma.activity.count({
            where: {
                activo: true,
                estado: "Pendiente",
                ...filtroPropietario
            }
        }),

        // ========================================
        // Actividades completadas
        // ========================================

        prisma.activity.count({
            where: {
                activo: true,
                estado: "Completada",
                ...filtroPropietario
            }
        }),

        // ========================================
        // Tareas pendientes
        // ========================================

        prisma.task.count({
            where: {
                activo: true,
                estado: "Pendiente",
                ...filtroPropietario
            }
        }),

        // ========================================
        // Tareas en progreso
        // ========================================

        prisma.task.count({
            where: {
                activo: true,
                estado: "En progreso",
                ...filtroPropietario
            }
        }),

        // ========================================
        // Tareas completadas
        // ========================================

        prisma.task.count({
            where: {
                activo: true,
                estado: "Completada",
                ...filtroPropietario
            }
        }),

        // ========================================
        // Notificaciones sin leer
        // ========================================

        prisma.notification.count({
            where: {
                activo: true,
                leida: false,
                ...filtroPropietario
            }
        })

    ]);

    return {

        usuarios,

        contactos,

        leads,

        oportunidades,

        valorTotalOportunidades:
            montoTotal._sum.monto || 0,

        actividadesPendientes,

        actividadesCompletadas,

        tareasPendientes,

        tareasEnProgreso,

        tareasCompletadas,

        notificacionesSinLeer

    };

};

module.exports = {
    obtenerEstadisticas
};