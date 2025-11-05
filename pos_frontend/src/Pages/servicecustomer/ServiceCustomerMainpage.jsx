import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import CustomersNav from "../../Components/ui/CustomersNav";
import HelpSupport from "../common/HelpSupport";
import AccountsTab from "../common/AccountTab";
import CustomerDashboard from "./CustomerDashboard";
import TicketsPage from "./TicketsPage";
import TicketDetailsPage from "../common/tickets/TicketDetailsPage";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import NotificationsPage from "../../Components/ui/NotificationsPage";
import ChatPage from "../common/ChatPage";
import CustomersLayout from "../../Components/ui/CustomersLayout";
import FloatingChatBot from "../../Components/ui/FloatingChatBot";

function ServiceCustomerMainpage() {
  return (
    <>
        <CustomersLayout>
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" />} />
            <Route path="/dashboard" element={<CustomerDashboard />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />
            <Route path="/support" element={<HelpSupport />} />
            <Route path="/account" element={<AccountsTab />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />


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

export default ServiceCustomerMainpage;
