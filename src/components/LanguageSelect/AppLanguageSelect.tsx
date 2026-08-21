import { NativeSelect } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { LANGS } from '../../config/languages';
import style from './AppLanguageSelect.module.css';

interface Props {
    dark?: boolean;
    ns?: string;
}

export default function AppLanguageSelect({ dark = false, ns = 'image_adv' }: Props) {
    const { t, i18n } = useTranslation(ns);

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            const value = event.target.value;
            if (!value || value === 'ar-SA') return;
            i18n.changeLanguage(value);
        },
        [i18n]
    );

    return (
        <div className={`${style.lang} ${dark ? style.dark : ''}`}>
            <NativeSelect
                value={i18n.language}
                onChange={handleChange}
                variant="outlined"
                data-testid="select-lang"
                inputProps={{ 'aria-label': t('app.language') }}
                className={`${style.select} ${dark ? style.darkSelect : ''}`}
            >
                {LANGS.map((language) => (
                    <option
                        key={language.name}
                        value={language.disabled ? '' : language.name}
                        disabled={language.disabled}
                    >
                        {language.label}
                    </option>
                ))}
            </NativeSelect>
            <LanguageIcon fontSize="small" />
        </div>
    );
}
