import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { saveAs } from 'file-saver';
import { useAuth } from '../../auth/AuthProvider';
import {
    accountLabel,
    bulkUsersRequest,
    createUserRequest,
    deleteUserRequest,
    GeneratedCredential,
    PublicUser,
    toCsv,
    updateUserRequest,
    UserRole,
} from '../../auth/api';
import style from './style.module.css';

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        background: '#ffffff',
    },
};

interface Props {
    users: PublicUser[];
    onUsersChange: (users: PublicUser[]) => void;
}

export default function UsersTab({ users, onUsersChange }: Props) {
    const { user: session } = useAuth();
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [editUser, setEditUser] = useState<PublicUser | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [generated, setGenerated] = useState<GeneratedCredential[]>([]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) {
            return users;
        }
        return users.filter((user) => accountLabel(user).toLowerCase().includes(needle) || user.role.includes(needle));
    }, [users, query]);

    const adminCount = users.filter((user) => user.role === 'admin' && user.active).length;

    const run = async (work: () => Promise<void>, success: string) => {
        setBusy(true);
        setError('');
        try {
            await work();
            setNotice(success);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save users.');
            throw err;
        } finally {
            setBusy(false);
        }
    };

    const downloadGeneratedCsv = (rows: GeneratedCredential[]) => {
        saveAs(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), 'user-access-codes.csv');
    };

    return (
        <div>
            <p className={style.notice}>
                Accounts are stored on the server. People in other locations can sign in as soon as you
                add them here. Access codes are never stored in plain text.
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

            <div className={style.toolbar}>
                <TextField
                    className={style.search}
                    label="Search users"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    size="medium"
                    sx={fieldSx}
                />
                <Button
                    variant="outlined"
                    startIcon={<PersonAddOutlinedIcon />}
                    onClick={() => setCreateOpen(true)}
                    disabled={busy}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                    Add user
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<GroupAddOutlinedIcon />}
                    onClick={() => setBulkOpen(true)}
                    disabled={busy}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                    Generate bulk users
                </Button>
            </div>

            <div className={style.tableWrap}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Username</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Updated</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((user) => {
                            const lastAdmin = user.role === 'admin' && user.active && adminCount <= 1;
                            const isSelf = session?.username.toLowerCase() === user.username.toLowerCase();
                            const label = accountLabel(user);
                            return (
                                <TableRow key={user.id} hover>
                                    <TableCell>
                                        <strong>{label}</strong>
                                        {isSelf ? ' (you)' : ''}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={user.role === 'admin' ? 'Admin' : 'User'}
                                            color={user.role === 'admin' ? 'primary' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={user.active}
                                            onChange={async () => {
                                                try {
                                                    const data = await updateUserRequest(user.id, { active: !user.active });
                                                    onUsersChange(data.users);
                                                    setNotice(`${label} is now ${user.active ? 'disabled' : 'active'}.`);
                                                } catch (err) {
                                                    setError(err instanceof Error ? err.message : 'Could not update that user.');
                                                }
                                            }}
                                            disabled={busy || (lastAdmin && user.active) || isSelf}
                                            inputProps={{ 'aria-label': `Active status for ${label}` }}
                                        />
                                        {user.active ? 'Active' : 'Disabled'}
                                    </TableCell>
                                    <TableCell>{new Date(user.updatedAt).toLocaleString()}</TableCell>
                                    <TableCell align="right">
                                        <div className={style.actions}>
                                            <IconButton
                                                aria-label={`Edit ${label}`}
                                                onClick={() => setEditUser(user)}
                                                disabled={busy}
                                            >
                                                <EditOutlinedIcon />
                                            </IconButton>
                                            <IconButton
                                                aria-label={`Delete ${label}`}
                                                onClick={() => setDeleteUserId(user.id)}
                                                disabled={busy || lastAdmin || isSelf}
                                            >
                                                <DeleteOutlineIcon />
                                            </IconButton>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5}>No users match that search.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {generated.length > 0 && (
                <section className={style.generatedWrap}>
                    <h3>New access codes</h3>
                    <p className={style.notice}>
                        These codes are shown once. Download the CSV and keep it private. Do not upload
                        the CSV to the website.
                    </p>
                    <Button
                        variant="contained"
                        startIcon={<FileDownloadOutlinedIcon />}
                        onClick={() => downloadGeneratedCsv(generated)}
                        sx={{ textTransform: 'none', fontWeight: 600, mb: 1.5 }}
                    >
                        Download CSV
                    </Button>
                    <div className={style.generatedTable}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Username</TableCell>
                                    <TableCell>Access code</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {generated.map((entry) => (
                                    <TableRow key={entry.username}>
                                        <TableCell>{entry.username}</TableCell>
                                        <TableCell>
                                            <code>{entry.accessCode}</code>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            )}

            <UserFormDialog
                title="Add user"
                open={createOpen}
                busy={busy}
                onClose={() => setCreateOpen(false)}
                onSubmit={async (values) => {
                    await run(async () => {
                        const data = await createUserRequest(values);
                        onUsersChange(data.users);
                        setCreateOpen(false);
                    }, `${values.username} was added.`);
                }}
            />

            <UserFormDialog
                title={`Edit ${editUser ? accountLabel(editUser) : 'user'}`}
                open={Boolean(editUser)}
                busy={busy}
                user={editUser || undefined}
                onClose={() => setEditUser(null)}
                onSubmit={async (values) => {
                    if (!editUser) {
                        return;
                    }
                    await run(async () => {
                        const data = await updateUserRequest(editUser.id, {
                            username: values.username.trim() || undefined,
                            role: values.role,
                            active: values.active,
                            accessCode: values.accessCode || undefined,
                        });
                        onUsersChange(data.users);
                        setEditUser(null);
                    }, 'User was updated.');
                }}
            />

            <BulkGenerateDialog
                open={bulkOpen}
                busy={busy}
                onClose={() => setBulkOpen(false)}
                onGenerate={async (values) => {
                    await run(async () => {
                        const data = await bulkUsersRequest(values);
                        onUsersChange(data.users);
                        setGenerated(data.generated);
                        downloadGeneratedCsv(data.generated);
                        setBulkOpen(false);
                    }, `Created ${values.count} accounts. Download the CSV with their access codes.`);
                }}
            />

            <Dialog open={Boolean(deleteUserId)} onClose={() => setDeleteUserId(null)}>
                <DialogTitle>Remove this user?</DialogTitle>
                <DialogContent>
                    They will not be able to sign in after this is saved.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteUserId(null)} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={busy}
                        onClick={async () => {
                            if (!deleteUserId) {
                                return;
                            }
                            try {
                                const data = await deleteUserRequest(deleteUserId);
                                onUsersChange(data.users);
                                setDeleteUserId(null);
                                setNotice('User was removed.');
                            } catch (err) {
                                setError(err instanceof Error ? err.message : 'Could not remove that user.');
                            }
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        Remove user
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

interface FormValues {
    username: string;
    accessCode: string;
    role: UserRole;
    active: boolean;
}

function UserFormDialog({
    title,
    open,
    busy,
    user,
    onClose,
    onSubmit,
}: {
    title: string;
    open: boolean;
    busy: boolean;
    user?: PublicUser;
    onClose: () => void;
    onSubmit: (values: FormValues) => Promise<void>;
}) {
    const [username, setUsername] = useState(user?.username || '');
    const [accessCode, setAccessCode] = useState('');
    const [role, setRole] = useState<UserRole>(user?.role || 'user');
    const [active, setActive] = useState(user?.active ?? true);
    const [error, setError] = useState('');
    const isEdit = Boolean(user);

    useEffect(() => {
        if (!open) {
            return;
        }
        setUsername(user?.username || '');
        setAccessCode('');
        setRole(user?.role || 'user');
        setActive(user?.active ?? true);
        setError('');
    }, [open, user]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        try {
            await onSubmit({ username, accessCode, role, active });
            setAccessCode('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save this user.');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={handleSubmit}>
                <DialogTitle>{title}</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
                    <TextField
                        label="Username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        required
                        fullWidth
                        sx={{ ...fieldSx, mt: 1 }}
                    />
                    <TextField
                        label={isEdit ? 'New access code (optional)' : 'Access code'}
                        value={accessCode}
                        onChange={(event) => setAccessCode(event.target.value)}
                        required={!isEdit}
                        fullWidth
                        helperText={
                            isEdit
                                ? 'Leave blank to keep the current access code.'
                                : 'Share this code privately. It is not stored in plain text.'
                        }
                        sx={fieldSx}
                    />
                    <FormControl fullWidth>
                        <InputLabel id="user-role-label">Role</InputLabel>
                        <Select
                            labelId="user-role-label"
                            label="Role"
                            value={role}
                            onChange={(event) => setRole(event.target.value as UserRole)}
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                    <label>
                        <Switch
                            checked={active}
                            onChange={(event) => setActive(event.target.checked)}
                        />
                        Active
                    </label>
                    {error && (
                        <p className={style.warning} role="alert">
                            {error}
                        </p>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={busy} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Save
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

function BulkGenerateDialog({
    open,
    busy,
    onClose,
    onGenerate,
}: {
    open: boolean;
    busy: boolean;
    onClose: () => void;
    onGenerate: (values: { count: number; prefix: string; startAt: number }) => Promise<void>;
}) {
    const [count, setCount] = useState(20);
    const [prefix, setPrefix] = useState('user');
    const [startAt, setStartAt] = useState(1);
    const [error, setError] = useState('');
    const previewStart = `${prefix.trim() || 'user'}${String(Math.max(1, startAt)).padStart(3, '0')}`;
    const lastNumber = Math.max(1, startAt) + Math.max(1, count) - 1;
    const previewEnd = `${prefix.trim() || 'user'}${String(lastNumber).padStart(Math.max(3, String(lastNumber).length), '0')}`;

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        try {
            await onGenerate({ count, prefix, startAt });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not generate users.');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={handleSubmit}>
                <DialogTitle>Generate bulk users</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
                    <p className={style.notice}>
                        Creates ordinary user accounts with random access codes. Admin accounts are not
                        created in bulk.
                    </p>
                    <TextField
                        label="How many accounts"
                        type="number"
                        value={count}
                        onChange={(event) => setCount(Number(event.target.value))}
                        inputProps={{ min: 1, max: 200 }}
                        required
                        sx={{ ...fieldSx, mt: 1 }}
                    />
                    <TextField
                        label="Username prefix"
                        value={prefix}
                        onChange={(event) => setPrefix(event.target.value)}
                        helperText={`Example: ${previewStart} to ${previewEnd}`}
                        sx={fieldSx}
                    />
                    <TextField
                        label="Start number"
                        type="number"
                        value={startAt}
                        onChange={(event) => setStartAt(Number(event.target.value))}
                        inputProps={{ min: 1 }}
                        sx={fieldSx}
                    />
                    {error && (
                        <p className={style.warning} role="alert">
                            {error}
                        </p>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="secondary" disabled={busy} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Generate
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
