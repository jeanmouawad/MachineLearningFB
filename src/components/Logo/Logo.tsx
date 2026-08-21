import style from './Logo.module.css';

interface Props {
    className?: string;
    height?: number;
}

export default function Logo({ className, height = 120 }: Props) {
    return (
        <img
            src="/futurebots-logo.png"
            alt="FutureBots"
            className={`${style.logo} ${className || ''}`}
            style={{ height }}
            width="auto"
        />
    );
}
