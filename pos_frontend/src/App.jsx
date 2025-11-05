import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import './index.css'
import { Toaster } from "react-hot-toast";
import AuthRoute from './Routes/AuthRoute.jsx';
import AuthMainPage from './Pages/auth/AuthMainPage';
import ServiceCustomerMainpage from './Pages/servicecustomer/ServiceCustomerMainpage';
import AdminMainPage from './Pages/admin/AdminMainPage';
import ServiceCustomerRoute from './Routes/ServiceCustomerRoute';
import AdminRoute from './Routes/AdminRoute.jsx';
import ManagerRoute from './Routes/ManagerRoute.jsx';
import WarehouseManagerRoute from './Routes/WarehouseManagerRoute.jsx';
import WarehouseTechnicianRoute from './Routes/WarehouseTechnicianRoute.jsx';
import TechnicianRoute from './Routes/TechnicianRoute.jsx';
import VendingCustomerRoute from './Routes/VendingCustomerRoute.jsx';
import ReporterRoute from './Routes/ReporterRoute.jsx';
import ExternalUserRoute from './Routes/ExternalUserRoute.jsx';
import PartnerRoute from './Routes/PartnerRoute.jsx';
import UserInfo from './Redux/Hooks/UserInfo';
import "react-loading-skeleton/dist/skeleton.css";
import ResetPassword from './Pages/auth/ResetPassword.jsx';
import TechnicianMainPage from './Pages/technician/TechnicianMainPage.jsx';
import NotFoundPage from './Components/ui/NotFoundPage.jsx';
import ManagerMainPage from './Pages/manager/ManagerMainPage.jsx';
import VendingCustomerMainPage from './Pages/vendingCustomer/VendingCustomerMainPage.jsx';
import ReporterMainPage from './Pages/reporter/ReporterMainPage.jsx';
import TicketReview from './Pages/common/tickets/TicketReview.jsx';
import ExternalUserMainPage from './Pages/externalUser/ExternalUserMainPage.jsx';
import WarehouseTechnicianPage from './Pages/warehouseTechnician/WarehouseTechnicianPage.jsx';
import WarehhouseManagerMainPage from './Pages/warehouseManager/WarehhouseManagerMainPage.jsx';
import PartnerMainPage from './Pages/partner/PartnerMainPage.jsx';
import AutoLogout from './utils/AutoLogout.js';
import GlobalChatListener from './Components/Common/GlobalChatListener';
import TodayTicketsPage from './Pages/common/TodayTicketsPage.jsx';
import DnDWrapper from './Components/Common/DnDWrapper.jsx';

function App() {

  return (
    <>
      <DnDWrapper>
        <Router>
          <UserInfo />
          <GlobalChatListener />
          <AutoLogout />
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{}}
            toastOptions={{
              // Define default options
              className: '',
              duration: 3000,
              style: {
                background: '#fff',
                color: '#363636',
              },
              // Default options for specific types
              success: {
                duration: 3000,
                theme: {
                  primary: 'green',
                  secondary: 'black',
                },
              },
            }}
          />

          <Routes>

          {/* Reset Password Route - Must be before catch-all AuthRoute */}
          <Route
            path="/reset-password/:uid/:token"
            element={<ResetPassword />}
          />

          {/* Review Route - Must be before catch-all AuthRoute */}
          <Route
            path="/review/:ticketId"
            element={<TicketReview />}
          />

          <Route path="/today-tickets" element={<TodayTicketsPage />} />

          {/* Super Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminMainPage />
              </AdminRoute>
            }
          />

          {/* Manager Routes */}
          <Route
            path="/manager/*"
            element={
              <ManagerRoute>
                <ManagerMainPage />
              </ManagerRoute>
            }
          />

          {/* Warehouse Manager Routes */}
          <Route
            path="/warehouse-manager/*"
            element={
              <WarehouseManagerRoute>
                <WarehhouseManagerMainPage />
              </WarehouseManagerRoute>
            }
          />

          {/* Warehouse Technician Routes */}
          <Route
            path="/warehouse-technician/*"
            element={
              <WarehouseTechnicianRoute>
                <WarehouseTechnicianPage />
              </WarehouseTechnicianRoute>
            }
          />

          {/* Technician Routes */}
          <Route
            path="/technician/*"
            element={
              <TechnicianRoute>
                <TechnicianMainPage />
              </TechnicianRoute>
            }
          />

          {/* Vending Customer Routes */}
          <Route
            path="/vending-customer/*"
            element={
              <VendingCustomerRoute>
                <VendingCustomerMainPage />
              </VendingCustomerRoute>
            }
          />

          {/* Service Customer Routes */}
          <Route
            path="/service-customer/*"
            element={
              <ServiceCustomerRoute>
                <ServiceCustomerMainpage />
              </ServiceCustomerRoute>
            }
          />

          {/* Reporter Routes */}
          <Route
            path="/reporter/*"
            element={
              <ReporterRoute>
                <ReporterMainPage />
              </ReporterRoute>
            }
          />

          {/* External User Routes */}
          <Route
            path="/external-user/*"
            element={
              <ExternalUserRoute>
                <ExternalUserMainPage />
              </ExternalUserRoute>
            }
          />


          {/* Partner Routes */}
          <Route
            path="/partner/*"
            element={
              <PartnerRoute>
                <PartnerMainPage />
              </PartnerRoute>
            }
          />

          {/* Auth Route - Catch-all for unauthenticated users */}
          <Route
            path="/*"
            element={
              <AuthRoute>
                <AuthMainPage />
              </AuthRoute>
            }
          />

          {/* Not Found Page */}
          <Route
            path="*"
            element={
              <NotFoundPage />
            }
          />

          </Routes>
        </Router>
      </DnDWrapper>
    </>
  )
}

export default App


