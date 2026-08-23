import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tab, Tabs } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { theme } from '../../theme/theme';
import LogoutButton from '../../components/LogoutButton/LogoutButton';
import { fetchUsers, type PublicUser } from '../../auth/api';
import UsersTab from './UsersTab';
import SecurityTab from './SecurityTab';
import style from './style.module.css';

export default function AdminSettings() {
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const [users, setUsers] = useState<PublicUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        fetchUsers()
            .then((data) => {
                if (active) {
                    setUsers(data.users);
                }
            })
            .catch(() => {
                if (active) {
                    setError('Could not load users.');
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });
        return () => {
            active = false;
        };
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <div className={style.page}>
                <header className={style.topBar}>
                    <div className={style.topBarLeft}>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/home')}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Home
                        </Button>
                        <div className={style.brand}>
                            <p className={style.eyebrow}>Admin</p>
                            <h1 className={style.title}>Settings</h1>
                        </div>
                    </div>
                    <div className={style.topBarRight}>
                        <p className={style.signedIn}>Administrator</p>
                        <LogoutButton color="primary" />
                    </div>
                </header>

                <main className={style.content}>
                    <div className={style.panel}>
                        <Tabs
                            value={tab}
                            onChange={(_event, value) => setTab(value)}
                            aria-label="Settings sections"
                            sx={{
                                mb: 2,
                                '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '1rem' },
                            }}
                        >
                            <Tab label="Users" id="settings-tab-users" aria-controls="settings-panel-users" />
                            <Tab label="Security" id="settings-tab-security" aria-controls="settings-panel-security" />
                        </Tabs>
                        {loading && <p className={style.notice}>Loading users…</p>}
                        {error && (
                            <p className={style.warning} role="alert">
                                {error}
                            </p>
                        )}
                        {!loading && !error && tab === 0 && (
                            <div
                                id="settings-panel-users"
                                role="tabpanel"
                                aria-labelledby="settings-tab-users"
                            >
                                <UsersTab
                                    users={users}
                                    onUsersChange={setUsers}
                                />
                            </div>
                        )}
                        {!loading && !error && tab === 1 && (
                            <div
                                id="settings-panel-security"
                                role="tabpanel"
                                aria-labelledby="settings-tab-security"
                            >
                                <SecurityTab />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </ThemeProvider>
    );
}
