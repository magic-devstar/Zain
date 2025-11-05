import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import CustomersNav from "../../Components/ui/CustomersNav";
import ReporterDashboard from "./ReporterDashboard";
import AssignedLocationsPage from "./AssignedLocationsPage";
import ReadingsListPage from "../vendingCustomer/ReadingsListPage";
import ReadingDetailsPage from "../vendingCustomer/ReadingDetailsPage";
import HelpSupport from "../common/HelpSupport";
import AccountsTab from "../common/AccountTab";
import NotificationsPage from "../../Components/ui/NotificationsPage";
import ChatPage from "../common/ChatPage";
import CustomersLayout from "../../Components/ui/CustomersLayout";
import TutorialsList from "../common/Tutorials/TutorialsList";
import TutorialFormPage from "../common/Tutorials/TutorialFormPage";
import TutorialDetail from "../common/Tutorials/TutorialDetail";
import FloatingChatBot from "../../Components/ui/FloatingChatBot";

function ReporterMainPage() {
  return (
    <>
      <CustomersLayout>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" />} />

          <Route path="/dashboard" element={<ReporterDashboard />} />
          <Route path="/locations" element={<AssignedLocationsPage />} />
          <Route path="/locations/:locationName/:locationId" element={<ReadingsListPage />} />
          <Route path="/locations/:locationName/:locationId/:readingId" element={<ReadingDetailsPage />} />
          <Route path="/support" element={<HelpSupport />} />
          <Route path="/tutorials" element={<TutorialsList />} />
          <Route path="/tutorials/create" element={<TutorialFormPage />} />
          <Route path="/tutorials/:id" element={<TutorialDetail />} />
          <Route path="/tutorials/:id/edit" element={<TutorialFormPage />} />
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

export default ReporterMainPage;
