// ============================================
// Archivo: company.controller.js
// Descripción:
// Controlador del módulo Companies.
// Gestiona las peticiones HTTP y delega
// la lógica de negocio al Service.
// ============================================

const companyService = require("../services/company.service");

// ============================================
// Obtener todas las empresas
// ============================================

const obtenerTodas = async (req, res) => {

    try {

        const empresas = await companyService.obtenerTodos(
            req.user
        );

        return res.status(200).json({
            success: true,
            data: empresas
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ============================================
// Obtener empresa por ID
// ============================================

const obtenerPorId = async (req, res) => {

    try {

        const empresa = await companyService.obtenerPorId(
            Number(req.params.id),
            req.user
        );

        return res.status(200).json({
            success: true,
            data: empresa
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ============================================
// Crear empresa
// ============================================

const crear = async (req, res) => {

    try {

        const empresa = await companyService.crear(
            req.body,
            req.user
        );

        return res.status(201).json({
            success: true,
            message: "Empresa creada correctamente.",
            data: empresa
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ============================================
// Actualizar empresa
// ============================================

const actualizar = async (req, res) => {

    try {

        const empresa = await companyService.actualizar(
            Number(req.params.id),
            req.body,
            req.user
        );

        return res.status(200).json({
            success: true,
            message: "Empresa actualizada correctamente.",
            data: empresa
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ============================================
// Eliminación lógica
// ============================================

const eliminar = async (req, res) => {

    try {

        await companyService.eliminar(
            Number(req.params.id),
            req.user
        );

        return res.status(200).json({
            success: true,
            message: "Empresa eliminada correctamente."
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {

    obtenerTodas,

    obtenerPorId,

    crear,

    actualizar,

    eliminar

};