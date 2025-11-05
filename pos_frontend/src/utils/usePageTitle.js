import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/tickets': 'Tickets',
  '/assembly-tickets': 'Assembly Tickets',
  '/inventory': 'Inventory',
  '/vendor': 'Vendor',
  '/transfers': 'Transfers',
  '/warehouses': 'Warehouses',
  '/repairs': 'Repairs',
  '/reconcilation': 'Reconciliation',
  '/vehicles': 'Vehicles',
  '/chat': 'Chat',
  '/tutorials': 'Tutorials',
  '/support': 'Support',
  '/account': 'Account',
  '/notifications': 'Notifications',
  '/locations': 'Locations',
  '/partners': 'Partners',
  '/cashdrawer': 'Cash Drawer',
  '/vault': 'Vault',
  '/invoices': 'Invoices',
  '/groups': 'Groups',
  '/users': 'Users',
  '/customers': 'Customers',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/help': 'Help',
  '/about': 'About',
  '/contact': 'Contact',
  '/login': 'Login',
  '/register': 'Register',
  '/forgot-password': 'Forgot Password',
  '/reset-password': 'Reset Password',
  '/welcome': 'Welcome',
  '/home': 'Home',
  '/main': 'Main',
  '/admin': 'Admin',
  '/manager': 'Manager',
  '/technician': 'Technician',
  '/warehouse-manager': 'Warehouse Manager',
  '/warehouse-technician': 'Warehouse Technician',
  '/vending-customer': 'Vending Customer',
  '/service-customer': 'Service Customer',
  '/reporter': 'Reporter',
  '/external-user': 'External User',
  '/partner': 'Partner',
};

const generateTitleFromPath = (pathname) => {
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Define role names to check for
  const roleNames = [
    'admin', 'manager', 'technician', 'warehouse-manager', 'warehouse-technician',
    'vending-customer', 'service-customer', 'reporter', 'external-user', 'partner'
  ];
  
  // Check if this is a role-based route
  let roleName = null;
  let pageName = null;
  
  // Handle 3-part routes like /173/admin/dashboard
  if (pathParts.length >= 3 && /^\d+$/.test(pathParts[0])) {
    roleName = pathParts[1];
    pageName = pathParts[2];
  }
  // Handle 2-part routes like /admin/calendar
  else if (pathParts.length >= 2 && roleNames.includes(pathParts[0])) {
    roleName = pathParts[0];
    pageName = pathParts[1];
  }
  
  if (roleName && pageName) {
    // Map role names to proper titles
    const roleTitles = {
      'admin': 'Admin',
      'manager': 'Manager', 
      'technician': 'Technician',
      'warehouse-manager': 'Warehouse Manager',
      'warehouse-technician': 'Warehouse Technician',
      'vending-customer': 'Vending Customer',
      'service-customer': 'Service Customer',
      'reporter': 'Reporter',
      'external-user': 'External User',
      'partner': 'Partner'
    };
    
    // Map page names to proper titles
    const pageTitles = {
      'dashboard': 'Dashboard',
      'tickets': 'Tickets',
      'assembly-tickets': 'Assembly Tickets',
      'inventory': 'Inventory',
      'vendor': 'Vendor',
      'transfers': 'Transfers',
      'warehouses': 'Warehouses',
      'repairs': 'Repairs',
      'reconcilation': 'Reconciliation',
      'vehicles': 'Vehicles',
      'chat': 'Chat',
      'tutorials': 'Tutorials',
      'support': 'Support',
      'account': 'Account',
      'notifications': 'Notifications',
      'locations': 'Locations',
      'partners': 'Partners',
      'cashdrawer': 'Cash Drawer',
      'vault': 'Vault',
      'invoices': 'Invoices',
      'groups': 'Groups',
      'users': 'Users',
      'customers': 'Customers',
      'reports': 'Reports',
      'settings': 'Settings',
      'profile': 'Profile',
      'help': 'Help',
      'about': 'About',
      'contact': 'Contact',
      'login': 'Login',
      'register': 'Register',
      'forgot-password': 'Forgot Password',
      'reset-password': 'Reset Password',
      'welcome': 'Welcome',
      'home': 'Home',
      'main': 'Main',
      'calendar': 'Calendar'
    };
    
    const roleTitle = roleTitles[roleName] || roleName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    const pageTitle = pageTitles[pageName] || pageName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return `${roleTitle} / ${pageTitle}`;
  }
  
  // Handle regular routes
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }
  
  const basePath = pathname.split('/')[1];
  if (routeTitles[`/${basePath}`]) {
    return routeTitles[`/${basePath}`];
  }
  
  if (pathParts.length === 0) return 'Home';
  
  const title = pathParts
    .map(part => 
      part
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' - ');
  
  return title;
};

export const usePageTitle = (customTitle = null) => {
  const location = useLocation();
  
  useEffect(() => {
    let title;
    
    if (customTitle) {
      title = customTitle;
    } else {
      title = generateTitleFromPath(location.pathname);
    }
    
    document.title = title ? `${title} - TTINCNC` : 'TTINCNC';
  }, [location.pathname, customTitle]);
  
  return generateTitleFromPath(location.pathname);
};

export const getCurrentPageTitle = () => {
  return generateTitleFromPath(window.location.pathname);
}; 