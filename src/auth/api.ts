export type UserRole = 'admin' | 'user';

export interface SessionUser {
    id?: string;
    username: string;
    role: UserRole;
}

export interface PublicUser {
    id: string;
    username: string;
    role: UserRole;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GeneratedCredential {
    username: string;
    accessCode: string;
    role: UserRole;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (options.body) {
        headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(path, {
        ...options,
        credentials: 'include',
        headers,
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
    if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
    }
    return data;
}

export function fetchSession() {
    return request<{ user: SessionUser }>('/api/session.php');
}

export function loginRequest(username: string, accessCode: string) {
    return request<{ user: SessionUser }>('/api/login.php', {
        method: 'POST',
        body: JSON.stringify({ username, accessCode }),
    });
}

export function logoutRequest() {
    return request<{ ok: boolean }>('/api/logout.php', { method: 'POST', body: '{}' });
}

export function fetchUsers() {
    return request<{ users: PublicUser[] }>('/api/users.php');
}

export function createUserRequest(input: { username: string; accessCode: string; role: UserRole; active?: boolean }) {
    return request<{ user: PublicUser; users: PublicUser[] }>('/api/users.php', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function updateUserRequest(
    id: string,
    patch: { username?: string; accessCode?: string; role?: UserRole; active?: boolean }
) {
    return request<{ user: PublicUser; users: PublicUser[] }>(`/api/users.php?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
    });
}

export function deleteUserRequest(id: string) {
    return request<{ users: PublicUser[] }>(`/api/users.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
}

export function bulkUsersRequest(input: { count: number; prefix: string; startAt: number }) {
    return request<{ generated: GeneratedCredential[]; users: PublicUser[] }>('/api/users.php?bulk=1', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function changePasswordRequest(input: { currentCode: string; newCode: string; confirmCode: string }) {
    return request<{ ok: boolean }>('/api/password.php', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function toCsv(generated: GeneratedCredential[]): string {
    const header = 'Username,Access code,Role';
    const rows = generated.map((entry) => `${entry.username},${entry.accessCode},${entry.role}`);
    return `${header}\n${rows.join('\n')}\n`;
}

export function accountLabel(user: { username: string; role: UserRole }): string {
    return user.username || (user.role === 'admin' ? 'Admin' : 'User');
}
