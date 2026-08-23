import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';

export default function AdminGuard() {
    const location = useLocation();
    const { ready, user } = useAuth();

    if (!ready) {
        return <div />;
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    if (user.role !== 'admin') {
        return (
            <Navigate
                to="/home"
                replace
            />
        );
    }

    return <Outlet />;
}
