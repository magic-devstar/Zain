import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar"
import { AdminNav } from "./AdminNav";
import { useLocation } from 'react-router-dom';

function Adminlayout({ children }) {
  // Initialize from localStorage, default to expanded (true) if no saved state
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebarExpandedState');
    return savedState !== null ? JSON.parse(savedState) : window.innerWidth >= 768;
  });
  
  const location = useLocation();
  const isChatPage = location.pathname.includes('/chat');

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Only auto-expand on large screens if there's no saved state
      if (!localStorage.getItem('sidebarExpandedState')) {
        setIsSidebarOpen(window.innerWidth >= 768);
      }
    };

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close sidebar on small screens after navigation
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // Save to localStorage whenever sidebar state changes
  useEffect(() => {
    localStorage.setItem('sidebarExpandedState', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const expandSidebar = () => {
    setIsSidebarOpen(true);
  };

  return (
    <div className="flex">
      {/* Sidebar - overlay on small screens, push content on large screens */}
      <div
        className={`fixed xl:relative h-screen z-40 xl:z-auto transition-all duration-300 ease-in-out bg-[#273746]
          ${isSidebarOpen ? "translate-x-0 xl:w-56" : "-translate-x-full xl:translate-x-0 xl:w-20"} 
          ${isSidebarOpen ? "shadow-lg xl:shadow-none" : ""}`}
      >
        <Sidebar 
          isCollapsed={!isSidebarOpen} 
          onExpandRequest={expandSidebar} 
          onNavigationClick={toggleSidebar}
        />
      </div>

      {/* Overlay for sidebar on mobile - only show on small screens when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 xl:hidden z-30"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content */}
      <div className="w-full flex-1 min-w-0">
        <AdminNav toggleSidebar={toggleSidebar} isOpen={isSidebarOpen} />
        <div className={`bg-gray_bg h-[92vh] w-full overflow-auto min-w-0 ${!isChatPage ? ' px-2' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Adminlayout;
