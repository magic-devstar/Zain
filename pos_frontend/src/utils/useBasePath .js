import { useLocation } from 'react-router-dom';

const useBasePath = () => {
  const location = useLocation();
  const basePath = location.pathname.split("/")[1];
  return `/${basePath}`;
};

export default useBasePath;
