import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { TfiAngleDown } from "react-icons/tfi";
import api from "../../utils/api";
import { FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import { PiBellSimpleFill } from "react-icons/pi";
import { toast } from "react-hot-toast";
import Skeleton from "react-loading-skeleton";
import { clearUserInfo, setNotificationsLoading } from '../../Redux/Slices/UserSlice';
import useBasePath from '../../utils/useBasePath ';
import { Bell, ChevronLeft, ChevronRight, Menu, QrCode, Search } from "lucide-react";
import FavoritesDropdown from '../Common/FavoritesDropdown';
import ScanPopup from '../popups/ScanPopup';

function AdminNav({ toggleSidebar, isOpen }) {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState("");
  const [showScanPopup, setShowScanPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const dropdownRef = useRef(null);
  const basePath = useBasePath();
  const accountLink = `${basePath}/account`;
  const notificationsPage = `${basePath}/notifications`;
  const user = useSelector((state) => state.user.user);
  const loading = useSelector((state) => state.user.loading);
  const notificationsLoading = useSelector((state) => state.user.notificationsLoading);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const isNotificationsPage = location.pathname.includes("notifications");

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout/");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("userRole");
      toast.success("Logout Successful!");
      dispatch(clearUserInfo());
      setDropdownOpen(false);
      navigate("/");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`${basePath}/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchFocused(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      dispatch(setNotificationsLoading(true));
      const response = await api.get("/auth/unread-notifications/");
      setNotificationsCount(response.data.unread_count);
      console.log(response.data);
    } catch (error) {
      console.log("Failed to fetch notifications");
    } finally {
      dispatch(setNotificationsLoading(false));
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="client-nav w-full h-[7vh] bg-[#273746] py-5 px-4 sm:px-8 flex justify-between items-center sticky top-0 z-50 relative">
      {/* Pseudo-element for outer curve */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full -translate-y-16 translate-x-16"></div>

      <button
        onClick={toggleSidebar}
        className="relative"
      >
        <div className="relative w-6 h-6 flex items-center justify-center">
          <div className="relative w-5 h-4">
            {/* Top line */}
            <div className={`absolute top-0 h-0.5 bg-white rounded-full transition-all duration-600 ease-out
                      ${isOpen ? 'w-2 left-2 rotate-12' : 'w-2 right-2 -rotate-12'}`} />

            {/* Middle line */}
            <div className={`absolute top-1/2 -translate-y-1/2 h-0.5 bg-white rounded-full transition-all duration-600 ease-out delay-100
                      ${isOpen ? 'w-3 left-0 rotate-0' : 'w-3 right-0 rotate-0'}`} />

            {/* Bottom line */}
            <div className={`absolute bottom-0 h-0.5 bg-white rounded-full transition-all duration-600 ease-out delay-200
                      ${isOpen ? 'w-2 left-2 -rotate-12' : 'w-2 right-2 rotate-12'}`} />

            {/* Animated arrow indicator */}
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-600 ease-out
                      ${isOpen ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-2 scale-50'}`}>
              <svg className="w-2 h-2 text-emerald-400" fill="#0060AC" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </div>

            {/* Opening indicator */}
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-600 ease-out
                      ${isOpen ? 'opacity-0 translate-x-2 scale-50' : 'opacity-100 translate-x-0 scale-100'}`}>
              <svg className="w-4 h-4 text-emerald-400 mr-2" fill="#0060AC" viewBox="0 0 24 24">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </div>
          </div>

          {/* Energy wave effect */}
          <div className="absolute inset-0 
                     transition-all duration-500 -z-10 
                    animate-pulse" />
        </div>
      </button>
      <div className="absolute bottom-0 left-0 w-full h-2 bg-white rounded-tl-full -z-10" />

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl mx-4 md:mx-8 hidden md:block">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search tickets, inventory (serial #, MAC, IP), users, stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className={`w-full pl-10 pr-4 py-2 h-[4vh] bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${isSearchFocused ? 'bg-white/20 border-white/40' : ''
                }`}
            />
            {searchQuery && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary/80 text-white p-1 rounded-md transition-colors"
              >
                <Search className="h-3 w-3" />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="flex space-x-2 md:space-x-4 cursor-pointer items-center">
          <FavoritesDropdown />
          {(user?.role === 'Warehouse Manager' || user?.role === 'Admin' || user?.role === 'Manager') && (
            <button
              onClick={() => setShowScanPopup(true)}
              className="relative p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Scan QR Code"
            >
              <QrCode className="text-3xl text-primary_light hover:text-primary transition-colors" />
            </button>
          )}
          <Link onClick={() => setNotificationsCount([])} to={notificationsPage} data-btnbelowtooltip="Notifications" className="relative">
            <Bell className={`text-3xl ${isNotificationsPage ? "text-primary fill-primary" : "text-primary_light"}`} />
            {notificationsCount > 0 && (
              <div
                className={`absolute -top-2 right-3 min-w-6 h-6 bg-primary text-white text-[12px] rounded-full flex items-center justify-center vibrate`}
              >
                {notificationsCount}
              </div>
            )}
          </Link>
        </div>
        <div className="h-6 w-2 border-r border-gray-600"></div>
        <div className="relative" ref={dropdownRef}>
          <div className="flex gap-2 items-center" onClick={toggleDropdown}>
            {loading ? (
              <Skeleton circle width={32} height={32} />
            ) : (
              <img
                src={user?.profile_image}
                alt="Profile"
                className="w-8 h-8 object-cover rounded-full"
              />
            )}
            <p className="text-xs md:text-sm flex items-center gap-2 cursor-pointer">
              <span className="font-semibold truncate text-white">{loading ? <Skeleton width={70} height={20} /> : user?.username}</span>
              <TfiAngleDown className="text-[10px] text-white" />
            </p>
          </div>

          {!loading && isDropdownOpen && (
            <div className="absolute right-0 mt-6 bg-white shadow-lg rounded-lg border border-gray-200 w-[150px] z-50">
              <div className="py-2 px-4 w-full">
                <Link
                  to={accountLink}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-gray-100 text-gray-700 w-full"
                >
                  <FaUserCircle />
                  <span>Account</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-red-100 text-gray-700 w-full"
                >
                  <FaSignOutAlt className="text-red-600" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scan Popup */}
      <ScanPopup isOpen={showScanPopup} onClose={() => setShowScanPopup(false)} />
    </div>
  );
}

export { AdminNav };