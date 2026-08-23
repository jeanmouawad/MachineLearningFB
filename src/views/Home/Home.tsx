import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import style from './style.module.css';
import Model from './Model';
import { useState } from 'react';
import { Button, Checkbox, FormControlLabel } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import { theme } from '../../theme/theme';
import { ThemeProvider } from '@mui/material/styles';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import Logo from '../../components/Logo/Logo';
import LogoutButton from '../../components/LogoutButton/LogoutButton';
import AppLanguageSelect from '../../components/LanguageSelect/AppLanguageSelect';
import { isAdmin } from '../../auth/auth';

export default function Home() {
    const { t } = useTranslation('image_adv');
    const navigate = useNavigate();
    const [usb, setUsb] = useState(false);
    const admin = isAdmin();

    const hasSerial = 'serial' in navigator;

    return (
        <ThemeProvider theme={theme}>
            <main className={style.homeContainer}>
                <div className={style.topBar}>
                    {admin && (
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<SettingsIcon />}
                            className={style.lessonsButton}
                            onClick={() => navigate('/settings')}
                        >
                            {t('app.settings')}
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<MenuBookIcon />}
                        disabled
                        className={style.lessonsButton}
                        aria-label={`${t('app.lessons')} — ${t('app.comingSoon')}`}
                    >
                        {t('app.lessons')}
                        <span className={style.comingSoon}>{t('app.comingSoon')}</span>
                    </Button>
                    <AppLanguageSelect />
                    <LogoutButton color="primary" />
                </div>
                <div className={style.header}>
                    <div className={style.headerBrands}>
                        <Logo height={120} />
                        <div className={style.unicefPartner}>
                            <span className={style.partnerLabel}>{t('app.preparedFor')}</span>
                            <img
                                src="/unicef-logo.svg"
                                alt="UNICEF"
                                className={style.unicefLogo}
                            />
                        </div>
                    </div>
                    <div className={style.headerColumn}>
                        <h1>{t('app.title')}</h1>
                        <h2>{t('app.subtitle')}</h2>
                        <p className={style.privacyNotice}>{t('app.privacyNotice')}</p>
                    </div>
                </div>
                <div className={style.selectGroup}>
                    <div className={style.intro}>{t('app.selectModel')}</div>
                    <div className={style.cards}>
                        <Model
                            id="image"
                            usb={usb}
                            image="/dog1.jpg"
                        />
                        <Model
                            id="pose"
                            usb={usb}
                            image="/body.jpg"
                        />
                        <Model
                            id="hand"
                            usb={usb}
                            image="/gesture1.jpg"
                        />
                        <Model
                            id="speech"
                            usb={usb}
                            image="/sound1.jpg"
                            icon={<RecordVoiceOverIcon sx={{ fontSize: 64 }} />}
                        />
                    </div>
                    {hasSerial && (
                        <div className={style.options}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={usb}
                                        name="allowSerialUSB"
                                        onChange={(e) => setUsb(e.target.checked)}
                                    />
                                }
                                label={t('app.enableUSB')}
                            />
                        </div>
                    )}
                </div>
            </main>
        </ThemeProvider>
    );
}
