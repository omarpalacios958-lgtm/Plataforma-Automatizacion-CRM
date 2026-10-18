// ============================================
// Archivo: app.js
// Descripción:
// Configuración principal de la aplicación
// Express.
// ============================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./modules/auth/routes/auth.routes");
const userRoutes = require("./modules/users/routes/user.routes");
const roleRoutes = require("./modules/roles/routes/role.routes");
const contactRoutes = require("./modules/contacts/routes/contact.routes");
const leadRoutes = require("./modules/leads/routes/lead.routes");
const opportunityRoutes = require("./modules/opportunities/routes/opportunity.routes");
const activityRoutes = require("./modules/activities/routes/activity.routes");
const notificationRoutes = require("./modules/notifications/routes/notification.routes");
const taskRoutes = require("./modules/tasks/routes/task.routes");
const dashboardRoutes = require("./modules/dashboard/routes/dashboard.routes");
const companyRoutes = require("./modules/companies/routes/company.routes");
const fileRoutes = require("./modules/files/routes/file.routes");
const automationRoutes = require("./modules/automations/routes/automation.routes");

const app = express();

// ===========================
// Middlewares Globales
// ===========================
app.set("etag", false);

app.use(helmet());

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

// ===========================
// Rutas de la API
// ===========================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/automations", automationRoutes);

// ===========================
// Ruta de prueba
// ===========================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API CRM funcionando correctamente.",
        version: "1.0.0"
    });
});

// ===========================
// Ruta no encontrada
// ===========================

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: "La ruta solicitada no existe."
    });
});

// ===========================
// Middleware Global de Errores
// ===========================

app.use((error, req, res, next) => {
    console.error("Error:", error.message);

    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            success: false,
            message: "El JSON enviado no es válido."
        });
    }

    return res.status(error.status || 500).json({
        success: false,
        message:
            error.status && error.status < 500
                ? error.message
                : "Error interno del servidor."
    });
});

module.exports = app;