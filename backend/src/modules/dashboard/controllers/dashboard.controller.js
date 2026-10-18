// ============================================
// Archivo: dashboard.controller.js
// Descripción:
// Controlador encargado de atender las
// peticiones HTTP del módulo Dashboard.
// ============================================

const dashboardService = require("../services/dashboard.service");

// ============================================
// Obtener estadísticas generales
// ============================================

const obtenerEstadisticas = async (req, res) => {

    try {

        const estadisticas =
            await dashboardService.obtenerEstadisticas(req.user);

        return res.status(200).json({
            success: true,
            data: estadisticas
        });

    } catch (error) {

        console.error("Error Dashboard:", error);

        return res.status(500).json({
            success: false,
            message: "Error al obtener las estadísticas del Dashboard."
        });

    }

};

module.exports = {
    obtenerEstadisticas
};