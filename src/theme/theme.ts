import { createTheme } from '@mui/material/styles';

const primary = '#01717a';
const secondary = '#f18e1e';

export const theme = createTheme({
    palette: {
        primary: {
            main: primary,
            light: '#01929c',
            dark: '#015a61',
            contrastText: '#ffffff',
        },
        secondary: {
            main: secondary,
            light: '#f5b563',
            dark: '#c8720a',
            contrastText: '#ffffff',
        },
        success: {
            main: '#00972e',
        },
        background: {
            default: '#ffffff',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: [
            'Segoe UI',
            'Roboto',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),
    },
});
