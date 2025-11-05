import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Adminlayout from "../../Components/ui/Adminlayout";
import AdminDashboard from "../admin/AdminDashboard";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import AccountsTab from "../common/AccountTab";
import TicketsListPage from "../common/tickets/TicketsListPage";
import TicketDetailsPage from "../common/tickets/TicketDetailsPage";
import InventoryListPage from "../common/Inventory/InventoryListPage";
import WarehouseListpage from "../common/Inventory/WarehouseListpage";
import Warehousedetails from "../common/Inventory/Warehousedetails"; 
import UsersList from "../common/UsersList";
import InvoicesTab from "../common/InvoicesTab";
import ServiceCustomersList from "../common/ServiceCustomersList";
import ServiceCustomerDetails from "../common/ServiceCustomerDetails";
import VendingCustomerDetails from "../common/VendingCustomerDetails";
import VendingCustomersList from "../common/VendingCustomersList";
import ReadingsListPage from "../vendingCustomer/ReadingsListPage";
import ReadingDetailsPage from "../vendingCustomer/ReadingDetailsPage";
import NotificationsPage from "../../Components/ui/NotificationsPage";
import ChatPage from "../common/ChatPage";
import InventoryDetailsPage from "../common/Inventory/InventoryDetailsPage";
import Transferspage from "../common/transfers/Transferspage";
import VendorListPage from "../common/vendor/VendorListPage";
import VendorDetailsPage from "../common/vendor/VendorDetailsPage";
import DeactivatedCustomerDetails from "../common/DeactivatedCustomerDetails";
import DeactivatedCustomersList from "../common/DeactivatedCustomersList";
import TransferDetailPage from "../common/transfers/TransferDetailPage";
import TransferFormPage from "../common/transfers/TransferFormPage";
import ReconciliationReportDashboard from "../common/reconcilation/ReconciliationReportDashboard";
import ReconciliationForm from "../common/reconcilation/ReconciliationForm";
import VehiclesListPage from "../common/vehicles/VehiclesListPage";
import VehicledetailsPage from "../common/vehicles/VehicledetailsPage";
import ShiftsListPage from "../common/ShiftsListPage";
import UserDetailsPage from "../common/UserDetailsPage";
import SupportTicketListPage from "../common/support/SupportTicketListPage";
import SupportTicketDetailsPage from "../common/support/SupportTicketDetailsPage";
import TutorialsList from "../common/Tutorials/TutorialsList";
import TutorialDetail from "../common/Tutorials/TutorialDetail";
import TutorialFormPage from "../common/Tutorials/TutorialFormPage";
import GroupsListPage from "../common/groups/GroupsListPage";
import GroupDetailsPage from "../common/groups/GroupDetailsPage";
import ItemTransferHistory from "../common/Inventory/ItemTransferHistory";
import CashDrawerPage from "../common/accounts/CashDrawerPage";
import InvoiceDetailPage from "../common/invoices/InvoiceDetailPage";
import InvoiceCreatePage from "../common/invoices/InvoiceCreatePage";
import InvoiceChargeTypesPage from "../common/invoices/InvoiceChargeTypesPage";
import TicketCalendarPage from "../common/TicketCalendarPage";
import TodayTicketsPage from "../common/TodayTicketsPage";
import SearchResultsPage from "../common/SearchResultsPage";
import AssemblyTicketListPage from "../common/assembly/AssemblyTicketListPage";
import AssemblyTicketDetailsPage from "../common/assembly/AssemblyTicketDetailsPage";
import RepairsListPage from "../common/Inventory/RepairsListPage";
import FloatingChatBot from "../../Components/ui/FloatingChatBot";
import ExternalUsersList from "../common/ExternalUsersList";
import BriefReportsPage from "../common/BriefReportsPage";
import VaultPage from "../common/accounts/VaultPage";

function ManagerMainPage() {
  return (
    <>
      <Adminlayout>
      <Routes>
          <Route path="/" element={<Navigate to="dashboard" />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/tickets" element={<TicketsListPage />} />
          <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />

                    {/* Assembly Tickets */}
          <Route path="/assembly-tickets" element={<AssemblyTicketListPage />} />
          <Route path="/assembly-tickets/:id" element={<AssemblyTicketDetailsPage />} />

          <Route path="/service-customers" element={<ServiceCustomersList />} />
          <Route path="/service-customers/service-customer/:serviceCustomerId" element={<ServiceCustomerDetails />} />
          <Route path="/service-customers/service-customer/:serviceCustomerId/:ticketId" element={<TicketDetailsPage />} />

          <Route path="/vending-customers" element={<VendingCustomersList />} />
          <Route path="/vending-customers/vending-customer/:vendingCustomerId" element={<VendingCustomerDetails />} />
          <Route path="/vending-customers/vending-customer/:vendingCustomerId/:locationName/:locationId" element={<ReadingsListPage />} />
          <Route path="/vending-customers/vending-customer/:vendingCustomerId/:locationName/:locationId/:readingId" element={<ReadingDetailsPage />} />


          <Route path="/approval-customers" element={<DeactivatedCustomersList />} />
          <Route path="/approval-customers/:customerId/details" element={<DeactivatedCustomerDetails />} />

          <Route path="/vendor" element={<VendorListPage />} />
          <Route path="/vendor/:vendorId" element={<VendorDetailsPage />} />

          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/transfers" element={<Transferspage />} />
          <Route path="/transfers/:transferId" element={<TransferDetailPage />} />
          <Route path="/transfers/create" element={<TransferFormPage />} />
          <Route path="/transfers/edit/:transferId" element={<TransferFormPage />} />

          <Route path="/reconcilation" element={<ReconciliationReportDashboard />} />
          <Route path="/reconcilation/create" element={<ReconciliationForm />} />

          <Route path="/warehouses" element={<WarehouseListpage />} />
          <Route path="/warehouses/:warehouseId" element={<Warehousedetails />} />
          <Route path="/inventory/:inventoryName/:inventoryId/transfer" element={<InventoryDetailsPage />} />
          <Route path="/inventory/:inventoryName/:inventoryId/transfer/:itemId/history" element={<ItemTransferHistory />} />
          <Route path="/warehouses/:warehouseId/:inventoryName/:inventoryId/transfer" element={<InventoryDetailsPage />} />
          <Route path="/warehouses/:warehouseId/:inventoryName/:inventoryId/transfer/:itemId/history" element={<ItemTransferHistory />} />
          <Route path="/repairs" element={<RepairsListPage />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="/external-users" element={<ExternalUsersList />} />
          <Route path="/external-users/:userId" element={<UserDetailsPage />} />
          <Route path="/users/:userId" element={<UserDetailsPage />} />
          <Route path="/shifts" element={<ShiftsListPage />} />
          <Route path="/groups" element={<GroupsListPage />} />
          <Route path="/groups/:groupId" element={<GroupDetailsPage />} />

          <Route path="/vehicles" element={<VehiclesListPage />} />
          <Route path="/vehicles/:vehicleId" element={<VehicledetailsPage />} />

          <Route path="/invoices" element={<InvoicesTab />} />
          <Route path="/invoices/create" element={<InvoiceCreatePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/invoice-charge-types" element={<InvoiceChargeTypesPage />} />
          <Route path="/cash-drawer" element={<CashDrawerPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/support" element={<SupportTicketListPage />} />
          <Route path="/support/:ticketId" element={<SupportTicketDetailsPage />} />
          <Route path="/tutorials" element={<TutorialsList />} />
          <Route path="/tutorials/create" element={<TutorialFormPage />} />
          <Route path="/tutorials/:id" element={<TutorialDetail />} />
          <Route path="/tutorials/:id/edit" element={<TutorialFormPage />} />
          <Route path="/account" element={<AccountsTab />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/calendar" element={<TicketCalendarPage />} />
          <Route path="/calendar/tickets/:ticketId" element={<TicketDetailsPage />} />
          <Route path="/search" element={<SearchResultsPage />} />

          {/* Brief Reports */}
          <Route path="/brief-reports/*" element={<BriefReportsPage />} />

          {/* Not Found Page */}
          <Route
            path="*"
            element={
              <NotFoundPage />
            }
          />
        </Routes>
        <FloatingChatBot />
      </Adminlayout>
    </>
  );
}

export default ManagerMainPage;
