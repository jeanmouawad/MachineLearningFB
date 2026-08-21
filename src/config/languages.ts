export interface AppLanguage {
    name: string;
    label: string;
    disabled?: boolean;
}

export const LANGS: AppLanguage[] = [
    { name: 'de-DE', label: 'Deutsch' },
    { name: 'en-GB', label: 'English' },
    { name: 'pt-BR', label: 'Português Brasileiro' },
    { name: 'fr-FR', label: 'Français' },
    { name: 'fi-FI', label: 'Suomi' },
    { name: 'it-IT', label: 'Italiano' },
    { name: 'ja-JP', label: '日本語' },
    { name: 'kr-KR', label: '한국어' },
    { name: 'krl-FI', label: 'Karjala' },
    { name: 'si-LK', label: 'සිංහල' },
    { name: 'sv', label: 'Svenska' },
    { name: 'sw', label: 'Swahili' },
    { name: 'ru-RU', label: 'русский язык' },
    { name: 'tr-TR', label: 'Türkçe' },
    { name: 'ua-UA', label: 'Українська' },
    { name: 'ar-SA', label: 'العربية — Coming soon', disabled: true },
];
