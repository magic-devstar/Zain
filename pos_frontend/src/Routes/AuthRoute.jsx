import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Spinner from '../Components/Common/Spinner';
import { useAuth } from '../utils/useAuth';
import { useSelector } from 'react-redux';

const AuthRoute = ({ children }) => {
  const accessToken = localStorage.getItem('access');
  const storedRole = localStorage.getItem('userRole');
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loading = useSelector(state => state.user.loading);
  
  useEffect(() => {
    // Don't redirect while loading user data
    if (loading) {
      return;
    }

    // Allow access to signup page even if authenticated (for creating new accounts)
    const isOnSignupPage = location.pathname === '/sign-up';
    if (isOnSignupPage) {
      // Allow access to signup page, don't redirect
      return;
    }

    if (accessToken && storedRole) {
      // If authenticated and on login page, redirect to dashboard
      // Otherwise allow them to access other auth routes
      const isOnLoginPage = location.pathname === '/login' || location.pathname === '/';
      if (isOnLoginPage) {
        // Use stored role for initial routing, will be verified/updated by UserInfo component
        let redirectPath = '/service-customer/';
        switch (storedRole) {
          case 'Admin':
            redirectPath = '/admin/';
            break;
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
          case 'Reporter':
            redirectPath = '/reporter/'; 
            break;
          case 'Technician':
            redirectPath = '/technician/';
            break;
          case 'External User':
            redirectPath = '/external-user/';
            break;
          case 'Partner':
            redirectPath = '/partner/';
            break;
          case 'Employee':
            redirectPath = '/partner/';
            break;
          case 'User':
          case 'user':
            redirectPath = '/service-customer/';
            break;
          default:
            redirectPath = '/service-customer/';
            break;
        }
        navigate(redirectPath, { state: { from: location }, replace: true });
      }
    }
  }, [accessToken, storedRole, navigate, location, loading]);

  // Show loading spinner while fetching user data, but only if user has a token
  // If no token, user should be on login page, so don't show spinner
  if (loading && accessToken) {
    return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
  }

  return children;
};

export default AuthRoute;