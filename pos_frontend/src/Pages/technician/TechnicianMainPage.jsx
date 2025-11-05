import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import CustomersNav from "../../Components/ui/CustomersNav";
import TechnicianDashboard from "./TechnicianDashboard";
import TicketsPage from "./TicketsPage";
import HelpSupport from "../common/HelpSupport";
import TicketDetailsPage from "../common/tickets/TicketDetailsPage";
import AccountsTab from "../common/AccountTab";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import NotificationsPage from "../../Components/ui/NotificationsPage";
import ChatPage from "../common/ChatPage";
import CustomersLayout from "../../Components/ui/CustomersLayout";
import TicketEditPage from "../common/tickets/TicketEditPage";
import VehicledetailsPage from "../common/vehicles/VehicledetailsPage";
import VehiclesListPage from "../common/vehicles/VehiclesListPage";
import TutorialsList from "../common/Tutorials/TutorialsList";
import TutorialFormPage from "../common/Tutorials/TutorialFormPage";
import TutorialDetail from "../common/Tutorials/TutorialDetail";
import FloatingChatBot from "../../Components/ui/FloatingChatBot";
import AssemblyTicketListPage from "../common/assembly/AssemblyTicketListPage";
import AssemblyTicketDetailsPage from "../common/assembly/AssemblyTicketDetailsPage";
import CashDrawerPage from "../common/accounts/CashDrawerPage";

function TechnicianMainPage() {
  return (
    <>
      <CustomersLayout>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" />} />
          <Route path="/dashboard" element={<TechnicianDashboard />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />
          <Route path="/tickets/edit/:ticketId" element={<TicketEditPage />} />
          <Route path="/dashboard/edit/:ticketId" element={<TicketEditPage />} />
          <Route path="/assembly-tickets" element={<AssemblyTicketListPage />} />
          <Route path="/assembly-tickets/:id" element={<AssemblyTicketDetailsPage />} />

          <Route path="/vehicles" element={<VehiclesListPage />} />
          <Route path="/vehicles/:vehicleId" element={<VehicledetailsPage />} />

          <Route path="/support" element={<HelpSupport />} />
          <Route path="/tutorials" element={<TutorialsList />} />
          <Route path="/tutorials/create" element={<TutorialFormPage />} />
          <Route path="/tutorials/:id" element={<TutorialDetail />} />
          <Route path="/tutorials/:id/edit" element={<TutorialFormPage />} />
          <Route path="/account" element={<AccountsTab />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/cash-drawer" element={<CashDrawerPage />} />

          {/* Not Found Page */}
          <Route
            path="*"
            element={
              <NotFoundPage />
            }
          />
        </Routes>
        <FloatingChatBot />
      </CustomersLayout>
    </>
  );
}

export default TechnicianMainPage;
