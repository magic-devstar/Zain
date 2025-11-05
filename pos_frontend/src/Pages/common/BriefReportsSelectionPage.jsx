import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FaBriefcase, 
  FaTools, 
  FaCalendarAlt, 
  FaUsers, 
  FaIdBadge, 
  FaBoxes, 
  FaTruckLoading, 
  FaChartLine 
} from 'react-icons/fa';
import { BiSolidDoughnutChart } from 'react-icons/bi';
import { SlGraph } from 'react-icons/sl';
import { Car } from 'lucide-react';

const BriefReportsSelectionPage = () => {
  const user = useSelector((state) => state.user.user);
  const location = useLocation();
  const basePath = location.pathname.split('/brief-reports')[0];

  const navigationItems = [
    {
      id: 'tickets',
      name: 'Tickets',
      icon: FaBriefcase,
      path: '/tickets',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'assembly-tickets',
      name: 'Assembly Tickets',
      icon: FaTools,
      path: '/assembly-tickets',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'service-customers',
      name: 'Service Customers',
      icon: FaUsers,
      path: '/service-customers',
      color: 'bg-teal-500 hover:bg-teal-600'
    },
    {
      id: 'vending-customers',
      name: 'Vending Customers',
      icon: FaUsers,
      path: '/vending-customers',
      color: 'bg-cyan-500 hover:bg-cyan-600'
    },
    {
      id: 'approval-customers',
      name: 'Approval Customers',
      icon: FaUsers,
      path: '/approval-customers',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      id: 'vendor',
      name: 'Vendors',
      icon: FaIdBadge,
      path: '/vendor',
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      id: 'inventory',
      name: 'Inventory',
      icon: FaBoxes,
      path: '/inventory',
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      id: 'transfers',
      name: 'Transfers',
      icon: FaTruckLoading,
      path: '/transfers',
      color: 'bg-emerald-500 hover:bg-emerald-600'
    },
    {
      id: 'reconcilation',
      name: 'Reconciliation',
      icon: FaChartLine,
      path: '/reconcilation',
      color: 'bg-violet-500 hover:bg-violet-600'
    },
    {
      id: 'repairs',
      name: 'Repairs',
      icon: FaTools,
      path: '/repairs',
      color: 'bg-amber-500 hover:bg-amber-600'
    },
    {
      id: 'users',
      name: 'Users',
      icon: FaUsers,
      path: '/users',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'external-users',
      name: 'External Users',
      icon: FaUsers,
      path: '/external-users',
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      id: 'shifts',
      name: 'Shifts',
      icon: FaCalendarAlt,
      path: '/shifts',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      id: 'groups',
      name: 'Groups',
      icon: FaUsers,
      path: '/groups',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    {
      id: 'vehicles',
      name: 'Vehicles',
      icon: Car,
      path: '/vehicles',
      color: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      id: 'invoices',
      name: 'Invoices',
      icon: FaBriefcase,
      path: '/invoices',
      color: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
      id: 'cash-drawer',
      name: 'Cash Drawer',
      icon: BiSolidDoughnutChart,
      path: '/cash-drawer',
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    {
      id: 'vault',
      name: 'Vault',
      icon: SlGraph,
      path: '/vault',
      color: 'bg-red-600 hover:bg-red-700',
      adminOnly: true
    }
  ];

  // Filter items based on user role
  const filteredItems = navigationItems.filter(item => {
    if (item.adminOnly && user?.role !== 'Admin') {
      return false;
    }
    return true;
  });

  return (
    <div className="pb-6"  >
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-gray-600">Select any option to generate a report.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {filteredItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.id}
              to={`${basePath}/brief-reports${item.path}`}
              className="group"
            >
              <div className={`
                ${item.color} 
                rounded-lg p-6 shadow-lg transition-all duration-300 
                transform hover:scale-101 hover:shadow-xl
                cursor-pointer
              `}>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <IconComponent className="text-4xl text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {item.name}
                  </h3>
                  <p className="text-white/80 text-sm">
                    Click to navigate to {item.name.toLowerCase()}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No pages available for your role.</p>
        </div>
      )}
    </div>
  );
};

export default BriefReportsSelectionPage;
