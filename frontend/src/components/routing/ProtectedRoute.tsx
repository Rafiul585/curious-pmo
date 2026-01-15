import { Navigate, useLocation } from 'react-router-dom';
import { useMeQuery } from '../../api/authApi';
import { useAppSelector } from '../../hooks/redux';

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = useAppSelector((s) => s.auth.accessToken);
  const location = useLocation();
  const { isLoading } = useMeQuery(undefined, { skip: !token });

  if (!token && !isLoading) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};
