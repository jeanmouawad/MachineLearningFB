import { FormEvent, useState } from 'react';
import { Button, IconButton, InputAdornment, TextField } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { MIN_ACCESS_CODE_LENGTH } from '../../auth/config';
import { changePasswordRequest } from '../../auth/api';
import style from './style.module.css';

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        background: '#ffffff',
    },
};

export default function SecurityTab() {
    const [currentCode, setCurrentCode] = useState('');
    const [newCode, setNewCode] = useState('');
    const [confirmCode, setConfirmCode] = useState('');
    const [showCodes, setShowCodes] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setNotice('');
        setBusy(true);
        try {
            await changePasswordRequest({ currentCode, newCode, confirmCode });
            setCurrentCode('');
            setNewCode('');
            setConfirmCode('');
            setNotice('Your access code was updated. Use the new code the next time you sign in.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update the access code.');
        } finally {
            setBusy(false);
        }
    };

    const toggleVisibility = (
        <InputAdornment position="end">
            <IconButton
                aria-label={showCodes ? 'Hide access codes' : 'Show access codes'}
                onClick={() => setShowCodes((open) => !open)}
                edge="end"
            >
                {showCodes ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
            </IconButton>
        </InputAdornment>
    );

    return (
        <div>
            <p className={style.notice}>
                Change the access code for the account you are signed in with. The server stores a slow
                password hash only. The new code is never shown again after you save.
            </p>
            {notice && (
                <p className={style.success} role="status">
                    {notice}
                </p>
            )}
            {error && (
                <p className={style.warning} role="alert">
                    {error}
                </p>
            )}
            <form className={style.securityForm} onSubmit={handleSubmit}>
                <TextField
                    label="Current access code"
                    type={showCodes ? 'text' : 'password'}
                    value={currentCode}
                    onChange={(event) => setCurrentCode(event.target.value)}
                    autoComplete="current-password"
                    required
                    fullWidth
                    sx={fieldSx}
                    InputProps={{ endAdornment: toggleVisibility }}
                />
                <TextField
                    label="New access code"
                    type={showCodes ? 'text' : 'password'}
                    value={newCode}
                    onChange={(event) => setNewCode(event.target.value)}
                    autoComplete="new-password"
                    required
                    fullWidth
                    helperText={`At least ${MIN_ACCESS_CODE_LENGTH} characters.`}
                    sx={fieldSx}
                />
                <TextField
                    label="Confirm new access code"
                    type={showCodes ? 'text' : 'password'}
                    value={confirmCode}
                    onChange={(event) => setConfirmCode(event.target.value)}
                    autoComplete="new-password"
                    required
                    fullWidth
                    sx={fieldSx}
                />
                <Button
                    type="submit"
                    variant="contained"
                    disabled={busy}
                    sx={{ textTransform: 'none', fontWeight: 600, py: 1.2 }}
                >
                    {busy ? 'Saving…' : 'Update access code'}
                </Button>
            </form>
        </div>
    );
}
