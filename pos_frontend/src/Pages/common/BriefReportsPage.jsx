import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Adminlayout from "../../Components/ui/Adminlayout";
import BriefReportsSelectionPage from "./BriefReportsSelectionPage";
import AdminDashboard from "../admin/AdminDashboard";
import AccountsTab from "./AccountTab";
import TicketsListPage from "./tickets/TicketsListPage";
import UsersList from "./UsersList";
import InvoicesTab from "./InvoicesTab";
import WarehouseListpage from "./Inventory/WarehouseListpage";
import InventoryListPage from "./Inventory/InventoryListPage";
import Warehousedetails from "./Inventory/Warehousedetails";
import TicketDetailsPage from "./tickets/TicketDetailsPage";
import VendingCustomerDetails from "./VendingCustomerDetails";
import ReadingsListPage from "../vendingCustomer/ReadingsListPage";
import ReadingDetailsPage from "../vendingCustomer/ReadingDetailsPage";
import ServiceCustomerDetails from "./ServiceCustomerDetails";
import NotificationsPage from "../../Components/ui/NotificationsPage";
import ChatPage from "./ChatPage";
import InventoryDetailsPage from "./Inventory/InventoryDetailsPage";
import Transferspage from "./transfers/Transferspage";
import VendorListPage from "./vendor/VendorListPage";
import VendorDetailsPage from "./vendor/VendorDetailsPage";
import DeactivatedCustomersList from "./DeactivatedCustomersList";
import DeactivatedCustomerDetails from "./DeactivatedCustomerDetails";
import TransferFormPage from "./transfers/TransferFormPage";
import TransferDetailPage from "./transfers/TransferDetailPage";
import RepairsListPage from "./Inventory/RepairsListPage";
import ReconciliationReportDashboard from "./reconcilation/ReconciliationReportDashboard";
import ReconciliationForm from "./reconcilation/ReconciliationForm";
import VehiclesListPage from "./vehicles/VehiclesListPage";
import VehicledetailsPage from "./vehicles/VehicledetailsPage";
import ShiftsListPage from "./ShiftsListPage";
import UserDetailsPage from "./UserDetailsPage";
import SupportTicketListPage from "./support/SupportTicketListPage";
import SupportTicketDetailsPage from "./support/SupportTicketDetailsPage";
import TutorialsList from "./Tutorials/TutorialsList";
import TutorialDetail from "./Tutorials/TutorialDetail";
import TutorialFormPage from "./Tutorials/TutorialFormPage";
import GroupReportsPage from "./groups/GroupReportsPage";
import ItemTransferHistory from "./Inventory/ItemTransferHistory";
import CashDrawerPage from "./accounts/CashDrawerPage";
import VaultPage from "./accounts/VaultPage";
import InvoiceDetailPage from "./invoices/InvoiceDetailPage";
import InvoiceCreatePage from "./invoices/InvoiceCreatePage";
import InvoiceChargeTypesPage from "./invoices/InvoiceChargeTypesPage";
import TicketCalendarPage from "./TicketCalendarPage";
import SearchResultsPage from "./SearchResultsPage";
import AssemblyTicketListPage from "./assembly/AssemblyTicketListPage";
import AssemblyTicketDetailsPage from "./assembly/AssemblyTicketDetailsPage";
import FloatingChatBot from "../../Components/ui/FloatingChatBot";
import ExternalUsersList from "./ExternalUsersList";
import PriceMatrixPage from "./inventory/PriceMatrixPage";
import ServiceCustomersList from "./ServiceCustomersList";
import VendingCustomersList from "./VendingCustomersList";
import NotFoundPage from "../../Components/ui/NotFoundPage";
import PlatformConfigPage from "../admin/PlatformConfigPage";

function BriefReportsPage() {
    return (
        <>
            <Routes>
                {/* Default route - show selection page */}
                <Route path="/" element={<BriefReportsSelectionPage />} />

                {/* Dashboard */}
                <Route path="/dashboard" element={<AdminDashboard />} />

                {/* Tickets */}
                <Route path="/tickets" element={<TicketsListPage />} />
                <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />

                {/* Assembly Tickets */}
                <Route path="/assembly-tickets" element={<AssemblyTicketListPage />} />
                <Route path="/assembly-tickets/:id" element={<AssemblyTicketDetailsPage />} />

                {/* Customers */}
                <Route path="/service-customers" element={<ServiceCustomersList />} />
                <Route path="/service-customers/service-customer/:serviceCustomerId" element={<ServiceCustomerDetails />} />
                <Route path="/service-customers/service-customer/:serviceCustomerId/:ticketId" element={<TicketDetailsPage />} />

                <Route path="/vending-customers" element={<VendingCustomersList />} />
                <Route path="/vending-customers/vending-customer/:vendingCustomerId" element={<VendingCustomerDetails />} />
                <Route path="/vending-customers/vending-customer/:vendingCustomerId/:locationName/:locationId" element={<ReadingsListPage />} />
                <Route path="/vending-customers/vending-customer/:vendingCustomerId/:locationName/:locationId/:readingId" element={<ReadingDetailsPage />} />

                <Route path="/approval-customers" element={<DeactivatedCustomersList />} />
                <Route path="/approval-customers/:customerId/details" element={<DeactivatedCustomerDetails />} />

                {/* Inventory */}
                <Route path="/vendor" element={<VendorListPage />} />
                <Route path="/vendor/:vendorId" element={<VendorDetailsPage />} />

                <Route path="/inventory" element={<InventoryListPage />} />
                <Route path="/price-matrix" element={<PriceMatrixPage />} />
                <Route path="/platform-config" element={<PlatformConfigPage />} />
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

                {/* Users */}
                <Route path="/users" element={<UsersList />} />
                <Route path="/external-users" element={<ExternalUsersList />} />
                <Route path="/external-users/:userId" element={<UserDetailsPage />} />
                <Route path="/users/:userId" element={<UserDetailsPage />} />
                <Route path="/shifts" element={<ShiftsListPage />} />
                <Route path="/groups" element={<GroupReportsPage />} />

                {/* Vehicles */}
                <Route path="/vehicles" element={<VehiclesListPage />} />
                <Route path="/vehicles/:vehicleId" element={<VehicledetailsPage />} />

                {/* Accounts */}
                <Route path="/invoices" element={<InvoicesTab />} />
                <Route path="/invoices/create" element={<InvoiceCreatePage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/invoice-charge-types" element={<InvoiceChargeTypesPage />} />
                <Route path="/cash-drawer" element={<CashDrawerPage />} />
                <Route path="/vault" element={<VaultPage />} />

                {/* Support & Tutorials */}
                <Route path="/support" element={<SupportTicketListPage />} />
                <Route path="/support/:ticketId" element={<SupportTicketDetailsPage />} />
                <Route path="/tutorials" element={<TutorialsList />} />
                <Route path="/tutorials/create" element={<TutorialFormPage />} />
                <Route path="/tutorials/:id" element={<TutorialDetail />} />
                <Route path="/tutorials/:id/edit" element={<TutorialFormPage />} />

                {/* Other */}
                <Route path="/account" element={<AccountsTab />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/calendar" element={<TicketCalendarPage />} />
                <Route path="/calendar/tickets/:ticketId" element={<TicketDetailsPage />} />
                <Route path="/search" element={<SearchResultsPage />} />

                {/* Not Found Page */}
                <Route
                    path="*"
                    element={
                        <NotFoundPage />
                    }
                />
            </Routes>
            <FloatingChatBot />
        </>
    );
}

export default BriefReportsPage;
