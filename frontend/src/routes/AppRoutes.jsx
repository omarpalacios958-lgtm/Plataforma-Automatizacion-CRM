
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../layouts/MainLayout/MainLayout";
import Login from "../modules/auth/Login";
import Dashboard from "../modules/dashboard/Dashboard";
import Contacts from "../modules/contacts/Contacts";
import Companies from "../modules/companies/Companies";
import Leads from "../modules/leads/Leads";
import Opportunities from "../modules/opportunities/Opportunities";
import Activities from "../modules/activities/Activities";
import Tasks from "../modules/tasks/Tasks";
import Notifications from "../modules/notifications/Notifications";
import Files from "../modules/files/Files";
import Users from "../modules/users/Users";
import Automations from "../modules/automations/Automations";
import ChatVisitor from "../modules/chat/ChatVisitor";
import ChatCommercialInbox from "../modules/chat/ChatCommercialInbox";
import ChatCommercialDetail from "../modules/chat/ChatCommercialDetail";

import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/chat" element={<ChatVisitor />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contactos" element={<Contacts />} />
            <Route path="/empresas" element={<Companies />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/oportunidades" element={<Opportunities />} />
            <Route path="/actividades" element={<Activities />} />
            <Route path="/tareas" element={<Tasks />} />
            <Route path="/notificaciones" element={<Notifications />} />
            <Route path="/archivos" element={<Files />} />

            <Route
              element={
                <RoleRoute
                  rolesPermitidos={["Administrador", "Vendedor"]}
                />
              }
            >
              <Route
                path="/chat/comercial"
                element={<ChatCommercialInbox />}
              />
              <Route
                path="/chat/comercial/:conversationId"
                element={<ChatCommercialDetail />}
              />
            </Route>

            <Route
              element={
                <RoleRoute rolesPermitidos={["Administrador"]} />
              }
            >
              <Route path="/usuarios" element={<Users />} />
              <Route
                path="/automatizaciones"
                element={<Automations />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
