import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, InputAdornment, TextField } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { theme } from '../../theme/theme';
import { DEMO_ACCESS_CODE, DEMO_USERNAME, hasDemoCredentialsConfigured } from '../../auth/config';
import { isAuthenticated, login, validateCredentials } from '../../auth/auth';
import { clearLoginAttempts, isLoginThrottled, recordFailedLogin } from '../../auth/loginThrottle';
import Logo from '../../components/Logo/Logo';
import style from './style.module.css';

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        background: '#ffffff',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        '& fieldset': { borderColor: '#c5d8da' },
        '&:hover fieldset': { borderColor: '#01717a' },
        '&.Mui-focused fieldset': { borderColor: '#01717a', borderWidth: '2px' },
    },
    '& .MuiInputLabel-root': {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
    },
};

export default function Login() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: string } | null)?.from || '/home';
    const [username, setUsername] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [showCode, setShowCode] = useState(false);
    const [error, setError] = useState('');

    if (isAuthenticated()) {
        return (
            <Navigate
                to={from}
                replace
            />
        );
    }

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setError('');

        if (!hasDemoCredentialsConfigured()) {
            setError('Sign-in is not configured for this deployment.');
            return;
        }

        if (isLoginThrottled()) {
            setError('Too many failed attempts. Wait a few minutes and try again.');
            return;
        }

        if (!validateCredentials(username, accessCode, DEMO_USERNAME, DEMO_ACCESS_CODE)) {
            recordFailedLogin();
            setError('Invalid username or access code. Please try again.');
            return;
        }

        clearLoginAttempts();
        login();
        navigate(from, { replace: true });
    };

    return (
        <ThemeProvider theme={theme}>
            <div className={style.loginPage}>
                <aside className={style.brandPanel}>
                    <div className={style.orbOne} aria-hidden="true" />
                    <div className={style.orbTwo} aria-hidden="true" />
                    <div className={style.brandContent}>
                        <div className={style.logoCard}>
                            <Logo height={148} />
                        </div>
                        <h1 className={style.brandTitle}>AI Teachable Machine</h1>
                        <p className={style.brandCopy}>{t('app.loginBrandCopy')}</p>
                        <p className={style.privacyNote}>{t('app.privacyNotice')}</p>
                        <div className={style.partner}>
                            <span className={style.partnerLabel}>Prepared for</span>
                            <img
                                src="/unicef-logo.svg"
                                alt="UNICEF"
                                className={style.unicefLogo}
                            />
                        </div>
                    </div>
                </aside>

                <main className={style.formPanel}>
                    <div className={style.formInner}>
                        <div className={style.mobileBrand}>
                            <Logo height={72} />
                            <img
                                src="/unicef-logo.svg"
                                alt="UNICEF"
                                className={style.unicefLogoMobile}
                            />
                        </div>
                        <p className={style.formEyebrow}>Welcome back</p>
                        <h2 className={style.formTitle}>Sign in to continue</h2>
                        <p className={style.formLead}>Enter your username and access code to continue.</p>
                        <p className={style.formPrivacy}>{t('app.privacyNotice')}</p>

                        <form
                            className={style.form}
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <TextField
                                id="login-username"
                                label="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                required
                                fullWidth
                                sx={fieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonOutlineIcon htmlColor="#01717a" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                id="login-code"
                                label="Access code"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                type={showCode ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                fullWidth
                                sx={fieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlinedIcon htmlColor="#01717a" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label={showCode ? 'Hide access code' : 'Show access code'}
                                                onClick={() => setShowCode((open) => !open)}
                                                edge="end"
                                                size="large"
                                            >
                                                {showCode ? (
                                                    <VisibilityOffOutlinedIcon />
                                                ) : (
                                                    <VisibilityOutlinedIcon />
                                                )}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            {error && (
                                <p
                                    className={style.error}
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                size="large"
                                fullWidth
                                className={style.submit}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '1.05rem',
                                    py: 1.4,
                                    borderRadius: '12px',
                                    fontFamily: '"Segoe UI", system-ui, sans-serif',
                                    boxShadow: 'none',
                                    '&:hover': {
                                        background: '#015a61',
                                        boxShadow: '0 8px 20px rgba(1, 113, 122, 0.28)',
                                    },
                                }}
                            >
                                Sign in
                            </Button>
                        </form>
                    </div>
                </main>
            </div>
        </ThemeProvider>
    );
}
