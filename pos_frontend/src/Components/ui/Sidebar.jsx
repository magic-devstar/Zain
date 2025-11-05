import React, { useEffect, useState } from "react";
import { FaBoxes, FaBriefcase, FaBuilding, FaFileInvoice, FaHandshake, FaIdBadge, FaTruckLoading, FaUserClock, FaUsers, FaUsersCog, FaWarehouse, FaTools } from "react-icons/fa";
import { LiaAngleDownSolid, LiaAngleUpSolid } from "react-icons/lia";
import { RxTimer } from "react-icons/rx";
import { Link, useLocation } from "react-router-dom";
import { BiSolidDoughnutChart } from "react-icons/bi";
import { SlGraph } from "react-icons/sl";
import { AiFillQuestionCircle } from "react-icons/ai";
import useBasePath from '../../utils/useBasePath ';
import { BookOpen, Calendar, Car, MessageSquare } from "lucide-react";
import { useSelector } from 'react-redux';
import { IoCalculator } from "react-icons/io5";
import useReportsToggle from '../../utils/useReportsToggle';

const Sidebar = ({ isCollapsed = false, onExpandRequest, onNavigationClick }) => {
  const user = useSelector((state) => state.user.user);
  const location = useLocation();
  const basePath = useBasePath();
  const { reportsEnabled, toggleReports } = useReportsToggle();

  // Initialize accordion state from localStorage
  const [isAccordionOpen, setIsAccordionOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebarAccordionState');
    if (savedState !== null) {
      return JSON.parse(savedState);
    }
    return {
      customers: false,
      inventory: false,
      accounts: false,
      users: false,
    };
  });

  const currentSection = location.pathname.split("/").filter(Boolean)[1] || ""
  const [activeItem, setActiveItem] = useState(currentSection);
  const [sectionToOpen, setSectionToOpen] = useState(null);

  useEffect(() => {
    const pathParts = location.pathname.split("/").filter(Boolean);
    const newActiveItem = pathParts[1] || "";

    setActiveItem(newActiveItem);

    // Only open accordions if sidebar is not collapsed
    if (!isCollapsed) {
      const newAccordionState = {
        customers: false,
        inventory: false,
        accounts: false,
        users: false,
      };

      if (newActiveItem.startsWith("service-customers") || newActiveItem.startsWith("vending-customers") || newActiveItem.startsWith("active-customers") || newActiveItem.startsWith("approval-customers")) {
        newAccordionState.customers = true;
      } else if (
        newActiveItem.startsWith("vendor") ||
        newActiveItem.startsWith("inventory") ||
        newActiveItem.startsWith("inventory-categories") ||
        newActiveItem.startsWith("transfers") ||
        newActiveItem.startsWith("warehouses") ||
        newActiveItem.startsWith("reconcilation") ||
        newActiveItem.startsWith("repairs")
      ) {
        newAccordionState.inventory = true;
      } else if (
        newActiveItem.startsWith("invoices") ||
        newActiveItem.startsWith("invoice-charge-types") ||
        newActiveItem.startsWith("cash-drawer") ||
        newActiveItem.startsWith("vault")
      ) {
        newAccordionState.accounts = true;
      } else if (
        newActiveItem.startsWith("users") ||
        newActiveItem.startsWith("shifts") ||
        newActiveItem.startsWith("external-users") ||
        newActiveItem.startsWith("groups")
      ) {
        newAccordionState.users = true;
      }
      setIsAccordionOpen(newAccordionState);
    }
  }, [location.pathname, isCollapsed]);

  // Save accordion state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarAccordionState', JSON.stringify(isAccordionOpen));
  }, [isAccordionOpen]);

  // Watch for changes in isCollapsed and open the pending section if needed
  useEffect(() => {
    if (!isCollapsed && sectionToOpen) {
      setIsAccordionOpen(prev => ({
        ...prev,
        [sectionToOpen]: true
      }));
      setSectionToOpen(null);
    }
  }, [isCollapsed, sectionToOpen]);

  const toggleAccordion = (section) => {
    if (isCollapsed) {
      // If sidebar is collapsed, store the section to open and request expansion
      setSectionToOpen(section);
      onExpandRequest();
    } else {
      // Toggle just the clicked section while maintaining others
      setIsAccordionOpen(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    }
  };

  const handleItemClick = (item) => {
    setActiveItem(item);
  };

  // Handle navigation clicks to close sidebar on small screens
  const handleNavigationClick = () => {
    if (onNavigationClick && window.innerWidth < 768) {
      onNavigationClick();
    }
  };

  // Common classes for menu items
  const getMenuItemClasses = (isActive) => `
    flex items-center space-x-3 p-3 rounded-md cursor-pointer 
    ${isActive ? "bg-primary text-white hover:opacity-95" : "hover:bg-gray-600"}
    ${isCollapsed ? "justify-center xl:px-2" : ""}
  `;

  const getIconClasses = (isActive) => `
    text-xl ${isActive ? "text-white" : "text-primary_light"}
  `;

  return (
    <aside className={`relative sidebar h-full bg-[#273746] text-white overflow-x-hidden overflow-y-auto no-scrollbar transition-all duration-300 ${isCollapsed ? "w-20" : "w-56"}`}>
      {/* Background Pattern */}
      <div className="absolute top-[-100px] left-0 w-24 h-24 bg-gradient-to-tr from-green-400/20 to-blue-400/20 rounded-full translate-y-12 -translate-x-12"></div>

      <div className="flex items-center justify-center px-4 py-1 pb-0">
        <img
          src="/assets/images/logo.png"
          alt="TTINCNC"
          className={`sidebar-logo mt-2 ${isCollapsed ? "w-12" : "w-16"}`}
        />
      </div>

      <ul className={`space-y-1 text-sm py-4 flex flex-col gap-1.5 ${isCollapsed ? "px-2" : "px-4"}`}>
        {/* Dashboard */}
        <Link to={`${basePath}/dashboard`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem.startsWith("dashboard"))}>
            <RxTimer className={getIconClasses(activeItem.startsWith("dashboard"))} />
            {!isCollapsed && <span className="text-white">Dashboard</span>}
          </li>
        </Link>

        {/* Tickets */}
        <Link to={`${basePath}/tickets`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem.startsWith("tickets"))}>
            <FaBriefcase className={getIconClasses(activeItem.startsWith("tickets"))} />
            {!isCollapsed && <span className="text-white">Tickets</span>}
          </li>
        </Link>

        {/* Assembly Tickets */}
        <Link to={`${basePath}/assembly-tickets`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem.startsWith("assembly-tickets"))}>
            <FaTools className={getIconClasses(activeItem.startsWith("assembly-tickets"))} />
            {!isCollapsed && <span className="text-white">Assembly Tickets</span>}
          </li>
        </Link>

        {/* Calendar */}
        <Link to={`${basePath}/calendar`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem.startsWith("calendar"))}>
            <Calendar className={getIconClasses(activeItem.startsWith("calendar"))} />
            {!isCollapsed && <span className="text-white">Calendar</span>}
          </li>
        </Link>

        <hr className="my-1 border-gray-600" />

        {/* Users Section */}
        <li className={`p-3 ${isCollapsed ? "px-2" : ""}`}>
          <div
            className={`flex items-center cursor-pointer ${isCollapsed ? "justify-center" : "justify-between"}`}
            onClick={() => toggleAccordion("users")}
          >
            <div className="flex items-center">
              <FaUsers className={getIconClasses(isAccordionOpen.users)} />
              {!isCollapsed && <span className="ml-3 font-semibold text-white">Users</span>}
            </div>
            {!isCollapsed && (
              <span>
                {isAccordionOpen.users ? <LiaAngleUpSolid className="text-white" /> : <LiaAngleDownSolid className="text-white" />}
              </span>
            )}
          </div>
          {isAccordionOpen.users && !isCollapsed && (
            <ul className="ml-2 mt-2 flex flex-col gap-1 w-full">
              <Link to={`${basePath}/users`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "users")}>
                  <FaUsers className={getIconClasses(activeItem === "users")} />
                  <span className="text-white">Users</span>
                </li>
              </Link>
              <Link to={`${basePath}/external-users`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "external-users")}>
                  <FaUsers className={getIconClasses(activeItem === "external-users")} />
                  <span className="text-white">External Users</span>
                </li>
              </Link>
              <Link to={`${basePath}/shifts`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "shifts")}>
                  <FaUserClock className={getIconClasses(activeItem === "shifts")} />
                  <span className="text-white">Shifts</span>
                </li>
              </Link>
              <Link to={`${basePath}/groups`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "groups")}>
                  <FaUsersCog className={getIconClasses(activeItem === "groups")} />
                  <span className="text-white">Groups</span>
                </li>
              </Link>
            </ul>
          )}
        </li>

        {/* Customers Section */}
        <li className={`p-3 ${isCollapsed ? "px-2" : ""}`}>
          <div
            className={`flex items-center cursor-pointer ${isCollapsed ? "justify-center" : "justify-between"}`}
            onClick={() => toggleAccordion("customers")}
          >
            <div className="flex items-center">
              <FaBuilding className={getIconClasses(isAccordionOpen.customers)} />
              {!isCollapsed && <span className="ml-3 font-semibold text-white">Customers</span>}
            </div>
            {!isCollapsed && (
              <span>
                {isAccordionOpen.customers ? <LiaAngleUpSolid /> : <LiaAngleDownSolid />}
              </span>
            )}
          </div>
          {isAccordionOpen.customers && !isCollapsed && (
            <ul className="ml-2 mt-2 flex flex-col gap-1 w-full">
              <Link to={`${basePath}/service-customers`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "service-customers")}>
                  <FaBuilding className={getIconClasses(activeItem === "service-customers")} />
                  <span className="text-white">Service Customers</span>
                </li>
              </Link>
              <Link to={`${basePath}/vending-customers`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "vending-customers")}>
                  <FaHandshake className={getIconClasses(activeItem === "vending-customers")} />
                  <span className="text-white">Vending Customers</span>
                </li>
              </Link>
              <Link to={`${basePath}/approval-customers`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "approval-customers")}>
                  <FaHandshake className={getIconClasses(activeItem === "approval-customers")} />
                  <span className="text-white">Approval Required</span>
                </li>
              </Link>
            </ul>
          )}
        </li>

        {/* Inventory Section */}
        <li className={`p-3 ${isCollapsed ? "px-2" : ""}`}>
          <div
            className={`flex items-center cursor-pointer ${isCollapsed ? "justify-center" : "justify-between"}`}
            onClick={() => toggleAccordion("inventory")}
          >
            <div className="flex items-center">
              <FaBoxes className={getIconClasses(isAccordionOpen.inventory)} />
              {!isCollapsed && <span className="ml-3 font-semibold text-white">Inventory</span>}
            </div>
            {!isCollapsed && (
              <span>
                {isAccordionOpen.inventory ? <LiaAngleUpSolid /> : <LiaAngleDownSolid />}
              </span>
            )}
          </div>
          {isAccordionOpen.inventory && !isCollapsed && (
            <ul className="ml-2 mt-2 flex flex-col gap-1 w-full">
              <Link to={`${basePath}/vendor`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "vendor")}>
                  <FaIdBadge className={getIconClasses(activeItem === "vendor")} />
                  <span className="text-white">Vendors</span>
                </li>
              </Link>
              <Link to={`${basePath}/inventory`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "inventory")}>
                  <FaBoxes className={getIconClasses(activeItem === "inventory")} />
                  <span className="text-white">Inventory</span>
                </li>
              </Link>
              {(user?.role === "Admin" && user?.is_superuser) && (
                <Link to={`${basePath}/inventory-categories`} onClick={handleNavigationClick}>
                  <li className={getMenuItemClasses(activeItem === "inventory-categories")}>
                    <FaBoxes className={getIconClasses(activeItem === "inventory-categories")} />
                    <span className="text-white">Categories</span>
                  </li>
                </Link>
              )}
              {user?.role === "Admin" && (
                <Link to={`${basePath}/price-matrix`} onClick={handleNavigationClick}>
                  <li className={getMenuItemClasses(activeItem === "price-matrix")}>
                    <IoCalculator className={getIconClasses(activeItem === "price-matrix")} />
                    <span className="text-white">Price Matrix</span>
                  </li>
                </Link>
              )}
              <Link to={`${basePath}/transfers`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "transfers")}>
                  <FaTruckLoading className={getIconClasses(activeItem === "transfers")} />
                  <span className="text-white">Transfers</span>
                </li>
              </Link>
              <Link to={`${basePath}/warehouses`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "warehouses")}>
                  <FaWarehouse className={getIconClasses(activeItem === "warehouses")} />
                  <span className="text-white">Warehouses</span>
                </li>
              </Link>
              <Link to={`${basePath}/reconcilation`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "reconcilation")}>
                  <SlGraph className={getIconClasses(activeItem === "reconcilation")} />
                  <span className="text-white">Reconcilation</span>
                </li>
              </Link>
              <Link to={`${basePath}/repairs`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "repairs")}>
                  <FaWarehouse className={getIconClasses(activeItem === "repairs")} />
                  <span className="text-white">Repairs</span>
                </li>
              </Link>
            </ul>
          )}
        </li>

        {/* Accounts Section */}
        <li className={`p-3 ${isCollapsed ? "px-2" : ""}`}>
          <div
            className={`flex items-center cursor-pointer ${isCollapsed ? "justify-center" : "justify-between"}`}
            onClick={() => toggleAccordion("accounts")}
          >
            <div className="flex items-center">
              <FaFileInvoice className={getIconClasses(isAccordionOpen.accounts)} />
              {!isCollapsed && <span className="ml-3 font-semibold text-white">Accounts</span>}
            </div>
            {!isCollapsed && (
              <span>
                {isAccordionOpen.accounts ? <LiaAngleUpSolid /> : <LiaAngleDownSolid />}
              </span>
            )}
          </div>
          {isAccordionOpen.accounts && !isCollapsed && (
            <ul className="ml-2 mt-2 flex flex-col gap-1 w-full">
              <Link to={`${basePath}/invoices`} onClick={handleNavigationClick}>
                <li className={getMenuItemClasses(activeItem === "invoices")}>
                  <FaFileInvoice className={getIconClasses(activeItem === "invoices")} />
                  <span className="text-white">Invoices</span>
                </li>
              </Link>
              {user?.role === "Admin" && (
                <Link to={`${basePath}/invoice-charge-types`} onClick={handleNavigationClick}>
                  <li className={getMenuItemClasses(activeItem === "invoice-charge-types")}>
                    <FaFileInvoice className={getIconClasses(activeItem === "invoice-charge-types")} />
                    <span className="text-white">Charge Types</span>
                  </li>
                </Link>
              )}
              {((user?.permissions?.includes(2)) ||
                (user?.is_superuser && user?.role === "Admin")) && (
                  <Link to={`${basePath}/cash-drawer`} onClick={handleNavigationClick}>
                    <li className={getMenuItemClasses(activeItem === "cash-drawer")}>
                      <BiSolidDoughnutChart className={getIconClasses(activeItem === "cash-drawer")} />
                      <span className="text-white">Cash Drawer</span>
                    </li>
                  </Link>
                )}
              {((user?.permissions?.includes(1) && (user?.role === "Admin" || user?.role === "Manager")) ||
                (user?.is_superuser && user?.role === "Admin")) && (
                  <Link to={`${basePath}/vault`} onClick={handleNavigationClick}>
                    <li className={getMenuItemClasses(activeItem === "vault")}>
                      <SlGraph className={getIconClasses(activeItem === "vault")} />
                      <span className="text-white">Vault</span>
                    </li>
                  </Link>
                )}
            </ul>
          )}
        </li>

        <hr className="my-1 border-gray-600" />

        {/* Vehicles */}
        <Link to={`${basePath}/vehicles`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem === "vehicles")}>
            <Car className={getIconClasses(activeItem === "vehicles")} />
            {!isCollapsed && <span className="text-white">Vehicles</span>}
          </li>
        </Link>

        {/* Chat */}
        <Link to={`${basePath}/chat`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem === "chat")}>
            <MessageSquare className={getIconClasses(activeItem === "chat")} />
            {!isCollapsed && <span className="text-white">Chat</span>}
          </li>
        </Link>

        {/* Tutorials */}
        <Link to={`${basePath}/tutorials`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem === "tutorials")}>
            <BookOpen className={getIconClasses(activeItem === "tutorials")} />
            {!isCollapsed && <span className="text-white">Tutorials</span>}
          </li>
        </Link>

        {/* Support */}
        <Link to={`${basePath}/support`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem === "support")}>
            <AiFillQuestionCircle className={getIconClasses(activeItem === "support")} />
            {!isCollapsed && <span className="text-white">Support</span>}
          </li>
        </Link>

        <hr className="my-1 border-gray-600" />

        {user?.role === "Admin" && (
          <>
            <Link to={`${basePath}/platform-config`} onClick={handleNavigationClick}>
              <li className={getMenuItemClasses(activeItem === "platform-config")}>
                <IoCalculator className={getIconClasses(activeItem === "platform-config")} />
                {!isCollapsed && <span className="text-white">Platform Config</span>}
              </li>
            </Link>
            <hr className="my-1 border-gray-600" />
          </>
        )}

        {/* Brief Reports */}
        <Link to={`${basePath}/brief-reports`} onClick={handleNavigationClick}>
          <li className={getMenuItemClasses(activeItem.startsWith("brief-reports"))}>
            <SlGraph className={getIconClasses(activeItem.startsWith("brief-reports"))} />
            {!isCollapsed && <span className="text-white">Reports</span>}
          </li>
        </Link>

      </ul>
    </aside>
  );
};

export default Sidebar;