import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import { useSelector } from 'react-redux';
import Spinner from '../Components/Common/Spinner';

const AdminRoute = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const loading = useSelector(state => state.user.loading);
  const user = useSelector(state => state.user.user);
  const storedRole = localStorage.getItem('userRole');

  console.log('AdminRoute Debug:', {
    currentPath: location.pathname,
    apiRole: role,
    storedRole,
    isLoading: loading,
    hasUser: !!user,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    // Only proceed if we have user data and loading is complete
    if (!loading) {
      const currentRole = role || storedRole;
      console.log('AdminRoute: Checking role', { currentRole, apiRole: role, storedRole, loading, hasUser: !!user });
      
      // If not an admin, redirect to appropriate route
      if (currentRole && currentRole !== 'Admin') {
        let redirectPath;
        switch (currentRole) {
          case 'Manager':
            redirectPath = '/manager/';
            break;
          case 'Warehouse Manager':
            redirectPath = '/warehouse-manager/';
            break;
          case 'Warehouse Technician':
            redirectPath = '/warehouse-technician/';
            break;
          case 'Vending Customer':
            redirectPath = '/vending-customer/';
            break;
          case 'Service Customer':
            redirectPath = '/service-customer/';
            break;
          case 'Partner':
            redirectPath = '/partner/';
            break;
          case 'Reporter':
            redirectPath = '/reporter/';
            break;
          case 'Technician':
            redirectPath = '/technician/';
            break;
          case 'External User':
            redirectPath = '/external-user/';
            break;
          case 'Employee':
            redirectPath = '/partner/';
            break;
          default:
            redirectPath = '/';
        }
        console.log('AdminRoute: Redirecting non-admin user', { 
          from: location.pathname,
          to: redirectPath,
          currentRole
        });
        navigate(redirectPath, { replace: true });
      }
    }
  }, [role, storedRole, navigate, loading, location, user]);

  // Show loading spinner if we're loading or don't have user data yet
  if (loading || !user) {
    console.log('AdminRoute: Showing spinner while loading or waiting for user data');
    return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
  }

  // If we have role info and it's not admin, show spinner while redirecting
  const currentRole = role || storedRole;
  if (currentRole && currentRole !== 'Admin') {
    console.log('AdminRoute: Showing spinner while redirecting non-admin user');
    return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
  }

  // Only render children if we have both role and user data
  if (!user || !currentRole) {
    console.log('AdminRoute: Showing spinner while waiting for complete data');
    return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
  }

  console.log('AdminRoute: Rendering children, all checks passed');
  return children;
};

export default AdminRoute;
