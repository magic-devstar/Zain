import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import { useSelector, useDispatch } from 'react-redux';
import { TfiAngleDown } from "react-icons/tfi";
import api from "../../utils/api";
import { FaBoxes, FaLifeRing, FaMapMarkerAlt, FaSignOutAlt, FaTachometerAlt, FaTicketAlt, FaUserCircle, FaWarehouse, FaIdBadge, FaTruckLoading, FaCar, FaBook, FaUserFriends } from "react-icons/fa";
import { toast } from "react-hot-toast";
import Skeleton from "react-loading-skeleton";
import { clearUserInfo } from '../../Redux/Slices/UserSlice';
import useBasePath from '../../utils/useBasePath ';
import { Bell, BookOpen, QrCode } from "lucide-react";
import { MessageSquare } from "lucide-react";
import { SlGraph } from "react-icons/sl";
import FavoritesDropdown from '../Common/FavoritesDropdown';
import ScanPopup from '../popups/ScanPopup';

function CustomersNav() {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showScanPopup, setShowScanPopup] = useState(false);
  const dropdownRef = useRef(null);
  const basePath = useBasePath();
  const user = useSelector((state) => state.user.user);
  const navigate = useNavigate();
  const accountLink = `${basePath}/account`;
  const notificationsPage = `${basePath}/notifications`;
  const chatPage = `${basePath}/chat`;
  const dispatch = useDispatch();
  const mobileMenuRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState("");
  const [isInventoryDropdownOpen, setInventoryDropdownOpen] = useState(false);
  const inventoryDropdownRef = useRef(null);
  const isDashboardActive = location.pathname.includes('/dashboard');
  const isSupportActive = location.pathname.includes('/support');
  const isTicketsActive = location.pathname.includes('/tickets');
  const isRepairsActive = location.pathname.includes('/repairs');
  const isReconcilationActive = location.pathname.includes('/reconcilation');
  const isLoacationActive = location.pathname.includes('/locations');
  const isNotificationsPage = location.pathname.includes("notifications");
  const isChatPage = location.pathname.includes("chat");
  const isVendorActive = location.pathname.includes('/vendor');
  const isInventoryListActive = location.pathname.includes('/inventory');
  const isTransfersActive = location.pathname.includes('/transfers');
  const isWarehousesActive = location.pathname.includes('/warehouses');
  const isVehiclesActive = location.pathname.includes('/vehicles');
  const isTutorialsActive = location.pathname.includes('/tutorials');
  const isPartnersActive = location.pathname.includes('/partners');
  const isAssemblyTicketsActive = location.pathname.includes('/assembly-tickets');
  const isInventoryActive = isRepairsActive || isReconcilationActive || isVendorActive || isInventoryListActive || isTransfersActive || isWarehousesActive;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };


  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  const toggleInventoryDropdown = () => {
    setInventoryDropdownOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      // Call the backend logout API
      await api.post("/auth/logout/");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Clear local storage
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      toast.success("Logout Successfull !");
      dispatch(clearUserInfo());
      setDropdownOpen(false)
      // Navigate to login page
      navigate("/");
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get("/auth/unread-notifications/");
      setNotificationsCount(response.data.unread_count);
      console.log(response.data)
    } catch (error) {
      console.log("Failed to fetch notifications");
    }
  };
  useEffect(() => {
    fetchNotifications();
  }, []);


  useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);


  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target)
      ) {
        setIsMobileMenuOpen(false);
      }
      if (
        inventoryDropdownRef.current &&
        !inventoryDropdownRef.current.contains(e.target)
      ) {
        setInventoryDropdownOpen(false);
      }
    };

    // Attach event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <nav className="h-[8vh] sticky top-0 z-50 py-4 shadow-md bg-[#273746] flex justify-between items-center lg:grid lg:grid-cols-4 lg:grid-rows-1 lg:place-items-center md:gap-x-10">
      <Link className="w-auto sm:px-2 h-full" to="/">
        <div className="cursor-pointer flex items-center gap-2 h-full">
          <img src="/assets/images/logo.png" alt="Logo"
            className="h-full"
          />
        </div>
      </Link>

      {/* Main Navigation */}
      <ul
        className=" *:cursor-pointer lg:flex flex-col lg:flex-row lg:gap-5 col-span-2 row-start-2 row-end-3 md:row-span-1 font-medium md:items-center hidden"
      >
        <Link to={`${basePath}/dashboard`}
          className="group relative hover:text-primary duration-200 mb-2 text-white">
          Dashboard
          {isDashboardActive && (
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
          )}
        </Link>
        {/* Conditionally render Tickets or Locations */}
        {user?.role === 'Vending Customer' || user?.role === 'Reporter' ? (
          <>
            <Link to={`${basePath}/locations`}
              className="group relative hover:text-primary duration-200 mb-2 text-white">
              Locations
              {isLoacationActive && (
                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
              )}
            </Link>
            {user?.role === 'Vending Customer' && (
              <Link to={`${basePath}/tickets`}
                className="group relative hover:text-primary duration-200 mb-2 text-white">
                Tickets
                {isTicketsActive && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
                )}
              </Link>
            )}
          </>
        ) : user?.role === 'Warehouse Manager' ? (
          <>
            <Link to={`${basePath}/tickets`}
              className="group relative hover:text-primary duration-200 mb-2 text-white">
              Tickets
              {isTicketsActive && (
                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
              )}
            </Link>
            <div className="relative group" ref={inventoryDropdownRef}>
              <button
                onClick={toggleInventoryDropdown}
                className="group relative hover:text-primary duration-200 mb-2 text-white flex items-center gap-1"
              >
                Inventory <TfiAngleDown className="text-[10px]" />
                {isInventoryActive && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
                )}
              </button>
              {isInventoryDropdownOpen && (
                <div className="absolute left-0 mt-2 bg-white shadow-lg rounded-lg border border-gray-200 w-[150px] py-1">
                  <Link
                    to={`${basePath}/vendor`}
                    onClick={() => setInventoryDropdownOpen(false)}
                    className={`block px-4 py-2 text-sm ${isVendorActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100`}
                  >
                    Vendor
                  </Link>
                  <Link
                    to={`${basePath}/inventory`}
                    onClick={() => setInventoryDropdownOpen(false)}
                    className={`block px-4 py-2 text-sm ${isInventoryListActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100`}
                  >
                    Inventory
                  </Link>
                  <Link
                    to={`${basePath}/transfers`}
                    onClick={() => setInventoryDropdownOpen(false)}
                    className={`block px-4 py-2 text-sm ${isTransfersActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100`}
                  >
                    Transfers
                  </Link>
                  <Link
                    to={`${basePath}/warehouses`}
                    onClick={() => setInventoryDropdownOpen(false)}
                    className={`block px-4 py-2 text-sm ${isWarehousesActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100`}
                  >
                    Warehouses
                  </Link>
                  <Link
                    to={`${basePath}/repairs`}
                    onClick={() => setInventoryDropdownOpen(false)}
                    className={`block px-4 py-2 text-sm ${isRepairsActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100`}
                  >
                    Repairs
                  </Link>
                  <Link
                    to={`${basePath}/reconcilation`}
                    onClick={() => setInventoryDropdownOpen(false)}
                    className={`block px-4 py-2 text-sm ${isReconcilationActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100`}
                  >
                    Reconcilation
                  </Link>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {user?.role !== 'External User' && user?.role !== 'Partner' && user?.role !== 'Employee' && (
              <Link to={`${basePath}/tickets`}
                className="group relative hover:text-primary duration-200 mb-2 text-white">
                Tickets
                {isTicketsActive && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
                )}
              </Link>
            )}
          </>
        )}
        {(user?.role === 'Technician' || user?.role === 'Warehouse Manager') && (
          <Link to={`${basePath}/assembly-tickets`}
            className="group relative hover:text-primary duration-200 mb-2 text-white">
            Assembly
            {isAssemblyTicketsActive && (
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
            )}
          </Link>
        )}

        {(user.role === "Warehouse Manager" || user.role === "Technician" || user.role === "Warehouse Technician") && (
          <Link to={`${basePath}/vehicles`} className="group relative hover:text-primary duration-200 mb-2 text-white">
            Vehicles
            {isVehiclesActive && (
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
            )}
          </Link>
        )}
        {user?.role !== 'Vending Customer' && user?.role !== 'Service Customer' && user?.role !== 'External User' && user?.role !== 'Partner' && user?.role !== 'Employee' && (
          <Link to={`${basePath}/tutorials`}
            className="group relative hover:text-primary duration-200 mb-2 text-white">
            Tutorials
            {isTutorialsActive && (
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
            )}
          </Link>
        )}
        {user?.role === 'Vending Customer' && (
          <Link to={`${basePath}/partners`}
            className="group relative hover:text-primary duration-200 mb-2 text-white">
            Partners
            {isPartnersActive && (
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
            )}
          </Link>
        )}

        {(user?.permissions?.includes(2)) && (user?.role === 'Technician' || user?.role === 'Warehouse Manager') && (
          <Link to={`${basePath}/cash-drawer`}
            className="group relative hover:text-primary duration-200 mb-2 text-white">
            Cash Drawer
            {isPartnersActive && (
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
            )}
          </Link>
        )}

        <Link to={`${basePath}/support`} className="group relative hover:text-primary duration-200 mb-2 text-white">
          Support
          {isSupportActive && (
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 h-1 w-5 bg-primary rounded block"></span>
          )}
        </Link>
      </ul>


      <div className="flex items-center justify-center gap-1">
        {/* Right Section - Hidden on Mobile */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex gap-2 items-center">
            {user?.role !== 'External User' && (
              <>
                {user.role === 'Admin' || user.role === 'Manager' || user.role === 'Technician' || user.role === 'Warehouse Manager' || user.role === 'Reporter' && (
                  <Link to={chatPage} data-btnbelowtooltip="Chat" className="relative mr-2">
                    <MessageSquare
                      className={`text-3xl ${isChatPage ? "fill-primary text-primary" : "text-primary_light"}`}
                    />
                  </Link>
                )}
                {(user?.role === 'Warehouse Manager' || user?.role === 'Admin' || user?.role === 'Manager') && (
                  <button
                    onClick={() => setShowScanPopup(true)}
                    className="relative p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Scan QR Code"
                  >
                    <QrCode className="text-3xl text-primary_light hover:text-primary transition-colors" />
                  </button>
                )}
                {user?.role !== 'Partner' && user?.role !== 'Employee' && (
                  <Link onClick={() => setNotificationsCount([])} to={notificationsPage} data-btnbelowtooltip="Notifications" className="relative">
                    <Bell className={`text-3xl ${isNotificationsPage ? "text-primary fill-primary" : "text-primary_light"}`} />
                    {notificationsCount > 0 && (
                      <div className={`absolute -top-2 right-3 min-w-6 h-6 bg-primary text-white text-[12px] rounded-full flex items-center justify-center vibrate`}>
                        {notificationsCount}
                      </div>
                    )}
                  </Link>
                )}
              </>
            )}
            {user?.role !== 'Partner' && user?.role !== 'Employee' && user?.role !== 'External User' && user?.role !== 'Service Customer' && user?.role !== 'Vending Customer' && (
              <>
                <div className="h-6 w-2 border-r border-gray-600"></div>
                <FavoritesDropdown />
              </>
            )}
            <div className="h-6 w-2 border-r border-gray-600"></div>
            <div className="flex gap-2 items-center" onClick={toggleDropdown}>
              {isLoading ? (
                <Skeleton circle width={32} height={32} />  // Skeleton Loader when loading
              ) : (
                <img
                  src={user?.profile_image}  // Use dummy image if profile image is null
                  alt="Profile"
                  className="w-8 h-8 object-cover rounded-full"
                />
              )}
              <p className="text-xs lg:text-sm flex items-center gap-2 cursor-pointer">
                <span className="font-semibold truncate text-white">{isLoading ? <Skeleton width={70} height={20} /> : user?.username}</span>
                <TfiAngleDown className="text-[10px] text-white" />
              </p>
            </div>
          </div>

          {/* Dropdown Menu */}
          {!isLoading && isDropdownOpen && (
            <div className="absolute right-0 mt-6  bg-white shadow-lg rounded-lg border border-gray-200 w-[150px] z-50">
              <div className="py-2 px-4 w-full ">
                <Link
                  to={accountLink}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-gray-100 text-gray-700 w-full "
                >
                  <FaUserCircle />
                  <span>Account</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-red-100 text-gray-700 w-full "
                >
                  <FaSignOutAlt className="text-red-600" />

                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Mobile Menu Button */}
        <div className="flex lh:hidden col-start-2 justify-center items-center pr-4 relative lg:hidden" ref={mobileMenuRef} >
          <button onClick={toggleMobileMenu}>
            <FiMenu className="text-2xl text-white" />
          </button>
          {/* Dropdown Menu */}
          {!isLoading && isMobileMenuOpen && (
            <div className="absolute right-5 mt-55  bg-white shadow-lg rounded-lg border border-gray-200 w-[180px] z-50">
              <div className="py-2 px-4 w-full ">
                <Link to={`${basePath}/dashboard`}
                  onClick={(e) => { e.preventDefault(); navigate(`${basePath}/dashboard`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                  className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isDashboardActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                    }`}
                >
                  <FaTachometerAlt />
                  <span>Dashboard</span>
                </Link>
                {user?.role === 'Vending Customer' || user?.role === 'Reporter' ? (
                  <>
                    <Link to={`${basePath}/locations`}
                      onClick={(e) => { e.preventDefault(); navigate(`${basePath}/locations`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                      className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isLoacationActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                        }`}
                    >
                      <FaMapMarkerAlt />
                      <span>Locations</span>
                    </Link>
                    {user?.role === 'Vending Customer' && (

                      <Link to={`${basePath}/tickets`}
                        onClick={(e) => { e.preventDefault(); navigate(`${basePath}/tickets`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                        className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isTicketsActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                          }`}
                      >
                        <FaTicketAlt />
                        <span>Tickets</span>
                      </Link>
                    )}
                  </>
                ) : user?.role === 'Warehouse Manager' ? (
                  <>
                    <Link to={`${basePath}/tickets`}
                      onClick={(e) => { e.preventDefault(); navigate(`${basePath}/tickets`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                      className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isTicketsActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                        }`}
                    >
                      <FaTicketAlt />
                      <span>Tickets</span>
                    </Link>
                    <div className="relative group" ref={inventoryDropdownRef}>
                      <button
                        onClick={toggleInventoryDropdown}
                        className={`flex items-center justify-between space-x-3 p-2 rounded-md cursor-pointer w-full ${isInventoryActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          <FaBoxes />
                          <span>Inventory</span>
                        </div>
                        <TfiAngleDown className={`text-[10px] transform transition-transform ${isInventoryDropdownOpen ? 'rotate-180' : ''}`} />

                      </button>
                      {isInventoryDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-2 bg-white shadow-lg rounded-lg border border-gray-200 w-full py-1 z-50">
                          <Link
                            to={`${basePath}/vendor`}
                            onClick={() => { navigate(`${basePath}/vendor`); setInventoryDropdownOpen(false); setMobileMenuOpen(false); }}
                            className={`flex items-center space-x-3 px-4 py-2 text-sm ${isVendorActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100 w-full`}
                          >
                            <FaIdBadge className={`${isVendorActive ? "text-primary" : "text-gray-500"} mr-2`} /> Vendor
                          </Link>
                          <Link
                            to={`${basePath}/inventory`}
                            onClick={() => { navigate(`${basePath}/inventory`); setInventoryDropdownOpen(false); setMobileMenuOpen(false); }}
                            className={`flex items-center space-x-3 px-4 py-2 text-sm ${isInventoryListActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100 w-full`}
                          >
                            <FaBoxes className={`${isInventoryListActive ? "text-primary" : "text-gray-500"} mr-2`} /> Inventory
                          </Link>
                          <Link
                            to={`${basePath}/transfers`}
                            onClick={() => { navigate(`${basePath}/transfers`); setInventoryDropdownOpen(false); setMobileMenuOpen(false); }}
                            className={`flex items-center space-x-3 px-4 py-2 text-sm ${isTransfersActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100 w-full`}
                          >
                            <FaTruckLoading className={`${isTransfersActive ? "text-primary" : "text-gray-500"} mr-2`} /> Transfers
                          </Link>
                          <Link
                            to={`${basePath}/warehouses`}
                            onClick={() => { navigate(`${basePath}/warehouses`); setInventoryDropdownOpen(false); setMobileMenuOpen(false); }}
                            className={`flex items-center space-x-3 px-4 py-2 text-sm ${isWarehousesActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100 w-full`}
                          >
                            <FaWarehouse className={`${isWarehousesActive ? "text-primary" : "text-gray-500"} mr-2`} /> Warehouses
                          </Link>
                          <Link
                            to={`${basePath}/repairs`}
                            onClick={() => { navigate(`${basePath}/repairs`); setInventoryDropdownOpen(false); setMobileMenuOpen(false); }}
                            className={`flex items-center space-x-3 px-4 py-2 text-sm ${isRepairsActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100 w-full`}
                          >
                            <FaWarehouse className={`${isRepairsActive ? "text-primary" : "text-gray-500"} mr-2`} /> Repairs
                          </Link>
                          <Link
                            to={`${basePath}/reconcilation`}
                            onClick={() => { navigate(`${basePath}/reconcilation`); setInventoryDropdownOpen(false); setMobileMenuOpen(false); }}
                            className={`flex items-center space-x-3 px-4 py-2 text-sm ${isReconcilationActive ? "text-primary font-semibold" : "text-gray-700"} hover:bg-gray-100 w-full`}
                          >
                            <SlGraph className={`${isReconcilationActive ? "text-primary" : "text-gray-500"} mr-2`} /> Reconcilation
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {user?.role !== 'External User' && user?.role !== 'Partner' && user?.role !== 'Employee' && (
                      <Link to={`${basePath}/tickets`}
                        onClick={(e) => { e.preventDefault(); navigate(`${basePath}/tickets`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                        className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isTicketsActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                          }`}
                      >
                        <FaTicketAlt />
                        <span>Tickets</span>
                      </Link>
                    )}
                  </>
                )}
                {(user?.role === 'Technician' || user?.role === 'Warehouse Manager') && (
                  <Link to={`${basePath}/assembly-tickets`}
                    onClick={(e) => { e.preventDefault(); navigate(`${basePath}/assembly-tickets`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isAssemblyTicketsActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                      }`}
                  >
                    <FaTicketAlt />
                    <span>Assembly</span>
                  </Link>
                )}

                {(user.role === "Warehouse Manager" || user.role === "Technician" || user.role === "Warehouse Technician") && (
                  <Link to={`${basePath}/vehicles`}
                    onClick={(e) => { e.preventDefault(); navigate(`${basePath}/vehicles`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isVehiclesActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                      }`}
                  >
                    <FaCar />
                    <span>Vehicles</span>
                  </Link>
                )}

                {user?.role !== 'Vending Customer' && user?.role !== 'Service Customer' && user?.role !== 'External User' && user?.role !== 'Partner' && user?.role !== 'Employee' && (
                  <Link to={`${basePath}/tutorials`}
                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isTutorialsActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                      }`}
                  >
                    <FaBook />
                    <span>Tutorials</span>
                  </Link>
                )}

                {user?.role === 'Vending Customer' && (
                  <Link to={`${basePath}/partners`}
                    onClick={(e) => { e.preventDefault(); navigate(`${basePath}/partners`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isPartnersActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                      }`}
                  >
                    <FaUserFriends />
                    <span>Partners</span>
                  </Link>
                )}
                <Link to={`${basePath}/support`}
                  onClick={(e) => { e.preventDefault(); navigate(`${basePath}/support`); setMobileMenuOpen(false); setDropdownOpen(false); }}
                  className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer w-full ${isSupportActive ? "bg-gray-100 text-primary font-semibold" : "hover:bg-gray-100 text-gray-700"
                    }`}
                >
                  <FaLifeRing />
                  <span>Support</span>
                </Link>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scan Popup */}
      <ScanPopup isOpen={showScanPopup} onClose={() => setShowScanPopup(false)} />
    </nav>
  );
}

export default CustomersNav;
