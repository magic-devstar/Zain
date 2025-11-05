import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import CustomersNav from "../../Components/ui/CustomersNav";
import HelpSupport from "../common/HelpSupport";
import AccountsTab from "../common/AccountTab";
import NotificationsPage from "../../Components/ui/NotificationsPage";
import ChatPage from "../common/ChatPage";
import CustomersLayout from "../../Components/ui/CustomersLayout";
import TicketsPage from "./TicketsPage";
import TicketDetailsPage from "../common/tickets/TicketDetailsPage";
import RepairsListPage from "../common/Inventory/RepairsListPage";
import ReconciliationReportDashboard from "../common/reconcilation/ReconciliationReportDashboard";
import VendorListPage from "../common/vendor/VendorListPage";
import VendorDetailsPage from "../common/vendor/VendorDetailsPage";
import InventoryListPage from "../common/Inventory/InventoryListPage";
import Transferspage from "../common/transfers/Transferspage";
import TransferDetailPage from "../common/transfers/TransferDetailPage";
import TransferFormPage from "../common/transfers/TransferFormPage";
import WarehouseListpage from "../common/Inventory/WarehouseListpage";
import Warehousedetails from "../common/Inventory/Warehousedetails";
import InventoryDetailsPage from "../common/Inventory/InventoryDetailsPage";
import ReconciliationForm from "../common/reconcilation/ReconciliationForm";
import VehiclesListPage from "../common/vehicles/VehiclesListPage";
import VehicledetailsPage from "../common/vehicles/VehicledetailsPage";
import TutorialsList from "../common/Tutorials/TutorialsList";
import TutorialFormPage from "../common/Tutorials/TutorialFormPage";
import TutorialDetail from "../common/Tutorials/TutorialDetail";
import ItemTransferHistory from "../common/Inventory/ItemTransferHistory";
import CashDrawerPage from "../common/accounts/CashDrawerPage";
import AssemblyTicketListPage from "../common/assembly/AssemblyTicketListPage";
import AssemblyTicketDetailsPage from "../common/assembly/AssemblyTicketDetailsPage";
import FloatingChatBot from "../../Components/ui/FloatingChatBot";
import AdminDashboard from "../admin/AdminDashboard";

function WarehhouseManagerMainPage() {
  return (
    <>
      <CustomersLayout>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" />} />
          <Route path="/dashboard" element={<AdminDashboard />} />

          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />

          {/* Assembly Tickets */}
          <Route path="/assembly-tickets" element={<AssemblyTicketListPage />} />
          <Route path="/assembly-tickets/:id" element={<AssemblyTicketDetailsPage />} />

          <Route path="/vendor" element={<VendorListPage />} />
          <Route path="/vendor/:vendorId" element={<VendorDetailsPage />} />

          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/transfers" element={<Transferspage />} /> 
          <Route path="/transfers/:transferId" element={<TransferDetailPage />} /> 
          <Route path="/transfers/create" element={<TransferFormPage />} /> 
          <Route path="/transfers/edit/:transferId" element={<TransferFormPage />} /> 
          
          <Route path="/warehouses" element={<WarehouseListpage />} />
          <Route path="/warehouses/:warehouseId" element={<Warehousedetails />} />
          <Route path="/inventory/:inventoryName/:inventoryId/transfer" element={<InventoryDetailsPage />} />
          <Route path="/inventory/:inventoryName/:inventoryId/transfer/:itemId/history" element={<ItemTransferHistory />} />
          <Route path="/warehouses/:warehouseId/:inventoryName/:inventoryId/transfer" element={<InventoryDetailsPage />} />
          <Route path="/warehouses/:warehouseId/:inventoryName/:inventoryId/transfer/:itemId/history" element={<ItemTransferHistory />} /> 

          <Route path="/repairs" element={<RepairsListPage />} />
          <Route path="/reconcilation" element={<ReconciliationReportDashboard />} />
          <Route path="/reconcilation/create" element={<ReconciliationForm />} />

          <Route path="/vehicles" element={<VehiclesListPage />} />
          <Route path="/vehicles/:vehicleId" element={<VehicledetailsPage />} />

          <Route path="/support" element={<HelpSupport />} />
          <Route path="/cash-drawer" element={<CashDrawerPage />} />
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

export default WarehhouseManagerMainPage;
