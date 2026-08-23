import {
    authenticate,
    changeOwnAccessCode,
    createUser,
    deleteUser,
    destroySession,
    generateBulkUsers,
    getSession,
    listPublicUsers,
    requireAdmin,
    requireUser,
    updateUser,
} from './authStore.mjs';

const COOKIE = 'tm_sid';

export function parseCookie(header, name = COOKIE) {
    if (!header) {
        return '';
    }
    const parts = String(header).split(';');
    for (const part of parts) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name) {
            return rest.join('=');
        }
    }
    return '';
}

export function cookieHeader(token, secure) {
    const base = `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800`;
    return secure ? `${base}; Secure` : base;
}

export function clearCookieHeader(secure) {
    const base = `${COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`;
    return secure ? `${base}; Secure` : base;
}

function jsonError(status, message) {
    return { status, json: { error: message }, setCookie: null };
}

function jsonOk(json, setCookie = null) {
    return { status: 200, json, setCookie };
}

export function handleAuthRequest({ method, path, body, cookieHeader: cookies, ip, secure }) {
    const token = parseCookie(cookies);
    const url = path.split('?')[0].replace(/\/+$/, '');

    try {
        if (url.endsWith('/api/login.php') && method === 'POST') {
            const result = authenticate(body?.username, body?.accessCode, ip);
            if (result.error === 'throttled') {
                return jsonError(429, 'Too many failed attempts. Wait a few minutes and try again.');
            }
            if (result.error) {
                return jsonError(401, 'Invalid username or access code.');
            }
            return {
                status: 200,
                json: { user: result.user },
                setCookie: cookieHeader(result.token, secure),
            };
        }

        if (url.endsWith('/api/logout.php') && method === 'POST') {
            destroySession(token);
            return { status: 200, json: { ok: true }, setCookie: clearCookieHeader(secure) };
        }

        if (url.endsWith('/api/session.php') && method === 'GET') {
            const session = getSession(token);
            if (!session) {
                return jsonError(401, 'Not signed in.');
            }
            return jsonOk({ user: session });
        }

        if (url.endsWith('/api/password.php') && method === 'POST') {
            const auth = requireUser(token);
            if (auth.error) {
                return jsonError(auth.status, 'Not signed in.');
            }
            changeOwnAccessCode(auth.session, body?.currentCode, body?.newCode, body?.confirmCode);
            return jsonOk({ ok: true });
        }

        if (url.endsWith('/api/users.php')) {
            const auth = requireAdmin(token);
            if (auth.error) {
                return jsonError(auth.status, auth.status === 403 ? 'Forbidden.' : 'Not signed in.');
            }
            const query = new URL(path, 'http://local').searchParams;
            if (method === 'GET') {
                return jsonOk({ users: listPublicUsers() });
            }
            if (method === 'POST' && query.get('bulk') === '1') {
                const generated = generateBulkUsers({
                    count: body?.count,
                    prefix: body?.prefix,
                    startAt: body?.startAt,
                });
                return jsonOk({ generated, users: listPublicUsers() });
            }
            if (method === 'POST') {
                const user = createUser({
                    username: body?.username,
                    accessCode: body?.accessCode,
                    role: body?.role,
                    active: body?.active,
                });
                return jsonOk({ user, users: listPublicUsers() });
            }
            if (method === 'PATCH') {
                const user = updateUser(query.get('id') || body?.id, {
                    username: body?.username,
                    accessCode: body?.accessCode,
                    role: body?.role,
                    active: body?.active,
                });
                return jsonOk({ user, users: listPublicUsers() });
            }
            if (method === 'DELETE') {
                deleteUser(query.get('id') || body?.id);
                return jsonOk({ users: listPublicUsers() });
            }
        }

        return jsonError(404, 'Not found.');
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Request failed.';
        const status = /not signed|forbidden/i.test(message) ? 403 : 400;
        return jsonError(status, message);
    }
}
