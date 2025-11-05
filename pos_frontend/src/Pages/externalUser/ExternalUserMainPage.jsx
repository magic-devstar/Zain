import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import CustomersNav from "../../Components/ui/CustomersNav";
import HelpSupport from "../common/HelpSupport";
import AccountsTab from "../common/AccountTab";
import NotificationsPage from "../../Components/ui/NotificationsPage";
import ChatPage from "../common/ChatPage";
import CustomersLayout from "../../Components/ui/CustomersLayout";
import ExternalUserDashboard from "./ExternalUserDashboard";

function ExternalUserMainPage() {
  return (
    <>
      <CustomersLayout>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" />} />

          <Route path="/dashboard" element={<ExternalUserDashboard />} />
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
      </CustomersLayout>
    </>
  );
}

export default ExternalUserMainPage;
