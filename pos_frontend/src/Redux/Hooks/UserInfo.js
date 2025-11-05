import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUserInfo, setUserLoading } from '../Slices/UserSlice';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

const UserInfo = () => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const loading = useSelector(state => state.user.loading);
  const navigate = useNavigate();

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const clearAuthData = () => {
    console.log('UserInfo: Clearing auth data and redirecting to login');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('userRole');
    dispatch(setUserInfo({ user: null }));
    dispatch(setUserLoading(false));
    navigate('/login');
  };

  const getRouteForRole = (role) => {
    const roleRoutes = {
      'Admin': '/admin/',
      'Manager': '/manager/',
      'Warehouse Manager': '/warehouse-manager/',
      'Warehouse Technician': '/warehouse-technician/',
      'Vending Customer': '/vending-customer/',
      'Service Customer': '/service-customer/',
      'Reporter': '/reporter/',
      'Technician': '/technician/',
      'External User': '/external-user/',
      'Partner': '/partner/',
      'Employee': '/partner/',
      'User': '/service-customer/',
      'user': '/service-customer/'
    };
    return roleRoutes[role] || '/service-customer/';
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    // Check if we're on a route that doesn't require authentication
    const currentPath = window.location.pathname;
    const publicRoutes = ['/reset-password', '/review'];
    const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));
    
    if (isPublicRoute) {
      console.log('UserInfo: On public route, skipping auth check', { currentPath });
      return;
    }

    console.log('UserInfo: Initial state', {
      hasUser: !!user,
      currentRole: user?.role,
      isLoading: loading,
      timestamp: new Date().toISOString()
    });

    const fetchUserWithRetry = async (retries = 3) => {
      const token = localStorage.getItem('access');
      const storedRole = localStorage.getItem('userRole');
      
      console.log('UserInfo: Checking auth state', { hasToken: !!token, storedRole });

      if (!token) {
        console.log('UserInfo: No token found');
        clearAuthData();
        return;
      }

      // Always fetch on mount/refresh to ensure we have fresh data
      console.log('UserInfo: Starting user data fetch');
      dispatch(setUserLoading(true));

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`UserInfo: Attempt ${attempt} to fetch user data`);
          const response = await api.get("/auth/profile/", {
            signal: controller.signal
          });
          
          if (!isMounted) {
            console.log('UserInfo: Component unmounted during fetch');
            dispatch(setUserLoading(false));
            return;
          }

          const apiRole = response.data.role;
          console.log('UserInfo: Received API response', { 
            apiRole, 
            storedRole,
            rolesMatch: apiRole === storedRole,
            userData: response.data
          });

          // Always update the stored role to match API
          if (apiRole !== storedRole) {
            console.log('UserInfo: Updating stored role to match API');
            localStorage.setItem('userRole', apiRole);
            toast.success('Your role has been updated');
          }

          // Update Redux state
          dispatch(setUserInfo({ user: response.data }));
          
          // If we're on the wrong route for our role, redirect
          const currentPath = window.location.pathname;
          const correctRoute = getRouteForRole(apiRole);
          if (!currentPath.startsWith(correctRoute)) {
            console.log('UserInfo: Redirecting to correct route', {
              from: currentPath,
              to: correctRoute
            });
            navigate(correctRoute, { replace: true });
          }
          
          // Ensure loading is set to false after state update
          setTimeout(() => {
            if (isMounted) {
              console.log('UserInfo: Clearing loading state after state update');
              dispatch(setUserLoading(false));
            }
          }, 0);
          
          return true;
        } catch (error) {
          if (!isMounted) {
            console.log('UserInfo: Component unmounted during error handling');
            dispatch(setUserLoading(false));
            return;
          }
          
          if (error.name === 'AbortError') {
            console.log('UserInfo: Request was aborted');
            dispatch(setUserLoading(false));
            return;
          }

          console.error(`UserInfo: Attempt ${attempt} failed`, error);
          
          if (attempt < retries) {
            console.log(`UserInfo: Retrying after delay (attempt ${attempt})`);
            await delay(1000 * Math.pow(2, attempt - 1));
            continue;
          }
          
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log('UserInfo: Authentication error, clearing session');
            toast.error('Session expired. Please login again');
            clearAuthData();
          } else {
            dispatch(setUserLoading(false));
            toast.error('Failed to load user data. Please refresh the page.');
          }
          return false;
        }
      }
    };

    fetchUserWithRetry();

    return () => {
      console.log('UserInfo: Cleanup - aborting requests');
      isMounted = false;
      controller.abort();
      dispatch(setUserLoading(false));
    };
  }, []); // Only run on mount

  return null;
};

export default UserInfo;
