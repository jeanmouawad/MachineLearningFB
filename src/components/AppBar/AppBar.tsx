import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVariant } from '../../util/variant';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import style from './AppBar.module.css';
import { useAtomValue, useSetAtom } from 'jotai';
import { loadState, menuShowSettings, saveState, showOpenDialog } from '../../state';
import SettingsIcon from '@mui/icons-material/Settings';
import { IconButton, Link as MUILink } from '@mui/material';
import Suggestion from '../Suggestion/Suggestion';
import { BusyButton } from '@genai-fi/base';
import Logo from '../Logo/Logo';
import LogoutButton from '../LogoutButton/LogoutButton';
import AppLanguageSelect from '../LanguageSelect/AppLanguageSelect';

interface Props {
    showReminder?: boolean;
    onSave: () => void;
}

export { LANGS } from '../../config/languages';

export default function ApplicationBar({ showReminder, onSave }: Props) {
    const { namespace, showSettings, showSaveReminder } = useVariant();
    const { t } = useTranslation(namespace);
    const saving = useAtomValue(saveState);
    const saveButtonRef = useRef(null);
    const [reminder, setReminder] = useState(true);
    const setShowOpenDialog = useSetAtom(showOpenDialog);
    const isloading = useAtomValue(loadState);
    const setShowSettings = useSetAtom(menuShowSettings);

    const openFile = useCallback(() => {
        setShowOpenDialog(true);
    }, [setShowOpenDialog]);

    const doSettings = useCallback(() => {
        setShowSettings(true);
    }, [setShowSettings]);

    const doSave = useCallback(() => {
        setReminder(false);
        onSave();
    }, [setReminder, onSave]);

    return (
        <nav className={style.appbar}>
            <Suggestion
                open={showReminder && reminder && showSaveReminder}
                anchorEl={saveButtonRef.current}
            >
                Remember to save your classifier.
            </Suggestion>
            <div className={style.toolbar}>
                <a
                    href="/home"
                    className={style.logo}
                    title="Home"
                >
                    <Logo
                        className={style.logoImage}
                        height={40}
                    />
                </a>
                <div className={style.buttonBar}>
                    <BusyButton
                        busy={isloading}
                        data-testid="open-project"
                        color="inherit"
                        variant="outlined"
                        startIcon={<FileOpenIcon />}
                        onClick={openFile}
                    >
                        {t('app.load')}
                    </BusyButton>
                    <BusyButton
                        busy={!!saving}
                        data-testid="save-project"
                        color="inherit"
                        variant="outlined"
                        startIcon={<SaveAltIcon />}
                        onClick={doSave}
                        ref={saveButtonRef}
                    >
                        {t('app.save')}
                    </BusyButton>
                </div>
                <div className={showSettings ? style.langBarWithSettings : style.langBar}>
                    <AppLanguageSelect
                        dark
                        ns="image_adv"
                    />
                </div>
                <LogoutButton className={style.logoutButton} />
                {showSettings && (
                    <IconButton
                        component={MUILink}
                        onClick={doSettings}
                        size="large"
                        color="inherit"
                        aria-label="Settings"
                    >
                        <SettingsIcon fontSize="large" />
                    </IconButton>
                )}
            </div>
        </nav>
    );
}
