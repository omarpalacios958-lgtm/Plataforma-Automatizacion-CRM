// ============================================
// Archivo: dashboard.service.js
// Descripción:
// Servicio encargado de la lógica de negocio
// del módulo Dashboard.
// ============================================

const dashboardRepository = require("../repositories/dashboard.repository");

// ============================================
// Obtener estadísticas generales
// ============================================

const obtenerEstadisticas = async (usuario) => {

    const estadisticas =
        await dashboardRepository.obtenerEstadisticas(usuario);

    return estadisticas;

};

module.exports = {
    obtenerEstadisticas
};