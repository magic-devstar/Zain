import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import HelpSupport from "../common/HelpSupport";
import AccountsTab from "../common/AccountTab";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import VendingCustomerDashboard from "./VendingCustomerDashboard";
import LocationsPage from "./LocationsPage";
import ReadingsListPage from "./ReadingsListPage";
import ReadingDetailsPage from "./ReadingDetailsPage";
import TicketsPage from "../servicecustomer/TicketsPage";
import TicketDetailsPage from "../common/tickets/TicketDetailsPage";
import NotificationsPage from "../../Components/ui/NotificationsPage";
import ChatPage from "../common/ChatPage";
import CustomersLayout from "../../Components/ui/CustomersLayout";
import PartnersListPage from "../common/PartnersListPage";
import UserDetailsPage from "../common/UserDetailsPage";
import PartnerDetailPage from "../common/PartnerDetailPage";
import FloatingChatBot from "../../Components/ui/FloatingChatBot";

function VendingCustomerMainPage() {
  return (
    <>
      <CustomersLayout>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" />} />
          <Route path="/dashboard" element={<VendingCustomerDashboard />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/locations/:locationName/:locationId" element={<ReadingsListPage />} />
          <Route path="/locations/:locationName/:locationId/:readingId" element={<ReadingDetailsPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />
          <Route path="/partners" element={<PartnersListPage />} />
          <Route path="/partners/:partnerId" element={<PartnerDetailPage />} />
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

export default VendingCustomerMainPage;
