// utils/useAuth.js
import { useSelector } from 'react-redux';

export const useAuth = () => {
  const user = useSelector((state) => state.user);
  const role = user?.user?.role;
  const loading = user?.loading;

  return { role, loading };
};
