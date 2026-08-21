import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton, ButtonProps } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { logout } from '../../auth/auth';

interface Props {
    variant?: 'icon' | 'button';
    className?: string;
    color?: ButtonProps['color'];
}

export default function LogoutButton({ variant = 'button', className, color = 'inherit' }: Props) {
    const navigate = useNavigate();

    const doLogout = useCallback(() => {
        logout();
        navigate('/login', { replace: true });
    }, [navigate]);

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
