import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const useReportsToggle = () => {
  const location = useLocation();
  const [reportsEnabled, setReportsEnabled] = useState(() => {
    return location.pathname.includes('brief-reports');
  });

  useEffect(() => {
    // Update reportsEnabled based on URL
    const isBriefReportsPage = location.pathname.includes('brief-reports');
    setReportsEnabled(isBriefReportsPage);
  }, [location.pathname]);

  const toggleReports = (enabled) => {
    // This function is kept for compatibility but now just updates state
    // The actual navigation should be handled by React Router
    setReportsEnabled(enabled);
  };

  return { reportsEnabled, toggleReports };
};

export default useReportsToggle;
