import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton, ButtonProps } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../auth/AuthProvider';

interface Props {
    variant?: 'icon' | 'button';
    className?: string;
    color?: ButtonProps['color'];
}

export default function LogoutButton({ variant = 'button', className, color = 'inherit' }: Props) {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const doLogout = useCallback(async () => {
        await logout();
        navigate('/login', { replace: true });
    }, [logout, navigate]);

    if (variant === 'icon') {
        return (
            <IconButton
                onClick={doLogout}
                size="large"
                color="inherit"
                aria-label="Sign out"
                className={className}
            >
                <LogoutIcon fontSize="large" />
            </IconButton>
        );
    }

    return (
        <Button
            onClick={doLogout}
            variant="outlined"
            color={color}
            startIcon={<LogoutIcon />}
            className={className}
            sx={{ textTransform: 'none' }}
        >
            Sign out
        </Button>
    );
}
