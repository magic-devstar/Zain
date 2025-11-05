import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import CustomersLayout from "../../Components/ui/CustomersLayout";
import PartnerDashboard from "./PartnerDashboard";
import AccountsTab from "../common/AccountTab";
import ChatPage from "../common/ChatPage";
import HelpSupport from "../common/HelpSupport";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import ReadingsListPage from "../vendingCustomer/ReadingsListPage";
import ReadingDetailsPage from "../vendingCustomer/ReadingDetailsPage";

function PartnerMainPage() {
  return (
    <CustomersLayout>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" />} />
        <Route path="/dashboard" element={<PartnerDashboard />} />
        <Route path="/dashboard/locations/:locationName/:locationId" element={<ReadingsListPage />} />
        <Route path="/dashboard/locations/:locationName/:locationId/:readingId" element={<ReadingDetailsPage />} />
        <Route path="/account" element={<AccountsTab />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/support" element={<HelpSupport />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </CustomersLayout>
  );
}

export default PartnerMainPage;
