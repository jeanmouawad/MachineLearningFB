import { useCallback } from 'react';
import style from './style.module.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/button/Button';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import Logo from '../../components/Logo/Logo';

export default function About() {
    const { key } = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const doReturn = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return (
        <div className={style.container}>
            <main data-testid="about-main">
                <header>
                    <Logo height={90} />
                    <h1>{t('about.title')}</h1>
                </header>
                <p>{t('about.description')}</p>

                <h2>{t('about.privacyTitle')}</h2>
                <Markdown>{(t('about.privacy', { returnObjects: true }) as string[]).join('\n\n')}</Markdown>

                {key !== 'default' && (
                    <p>
                        <Button
                            sx={{ fontSize: '14pt' }}
                            onClick={doReturn}
                            variant="contained"
                        >
                            {t('about.back')}
                        </Button>
                    </p>
                )}
            </main>
        </div>
    );
}
