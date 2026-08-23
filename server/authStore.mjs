import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateAccessCode, hashPassword, MIN_ACCESS_CODE_LENGTH, newId, normalizeUsername, verifyPassword } from './hashPassword.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function usersFilePath() {
    return process.env.TM_USERS_FILE || path.join(ROOT, 'data', 'users.json');
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

const sessions = new Map();
const loginAttempts = new Map();

function nowIso() {
    return new Date().toISOString();
}

function publicUser(user) {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export function readStore() {
    const raw = fs.readFileSync(usersFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 3 || !Array.isArray(parsed.users)) {
        throw new Error('User store is invalid.');
    }
    return parsed;
}

function writeStore(store) {
    const next = { ...store, updatedAt: nowIso() };
    const tmp = `${usersFilePath()}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
    fs.renameSync(tmp, usersFilePath());
    return next;
}

function countAdmins(users) {
    return users.filter((user) => user.role === 'admin' && user.active).length;
}

export function listPublicUsers() {
    return readStore().users.map(publicUser).sort((a, b) => {
        if (a.role !== b.role) {
            return a.role === 'admin' ? -1 : 1;
        }
        return a.username.localeCompare(b.username, undefined, { sensitivity: 'base' });
    });
}

function pruneAttempts(ip) {
    const now = Date.now();
    const current = loginAttempts.get(ip) || [];
    const fresh = current.filter((at) => now - at < LOGIN_WINDOW_MS);
    loginAttempts.set(ip, fresh);
    return fresh;
}

export function isLoginThrottled(ip) {
    return pruneAttempts(ip || 'local').length >= LOGIN_MAX_ATTEMPTS;
}

export function recordFailedLogin(ip) {
    const key = ip || 'local';
    const fresh = pruneAttempts(key);
    fresh.push(Date.now());
    loginAttempts.set(key, fresh);
}

export function clearLoginAttempts(ip) {
    loginAttempts.delete(ip || 'local');
}

export function authenticate(username, accessCode, ip) {
    if (isLoginThrottled(ip)) {
        return { error: 'throttled', status: 429 };
    }
    const typed = String(username || '').trim();
    const code = String(accessCode || '');
    if (!typed || !code) {
        recordFailedLogin(ip);
        return { error: 'invalid', status: 401 };
    }
    const store = readStore();
    const needle = normalizeUsername(typed);
    const user = store.users.find((entry) => normalizeUsername(entry.username) === needle);
    if (!user || !user.active || !verifyPassword(code, user.password)) {
        recordFailedLogin(ip);
        return { error: 'invalid', status: 401 };
    }
    clearLoginAttempts(ip);
    const token = createSession(user);
    return { user: publicUser(user), token };
}

export function createSession(user) {
    const token = cryptoRandomToken();
    const now = Date.now();
    sessions.set(token, {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: now,
        lastSeen: now,
    });
    return token;
}

function cryptoRandomToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function getSession(token) {
    if (!token) {
        return null;
    }
    const session = sessions.get(token);
    if (!session) {
        return null;
    }
    const now = Date.now();
    if (now - session.lastSeen > SESSION_TTL_MS || now - session.createdAt > SESSION_ABSOLUTE_MS) {
        sessions.delete(token);
        return null;
    }
    session.lastSeen = now;
    return { id: session.id, username: session.username, role: session.role };
}

export function destroySession(token) {
    if (token) {
        sessions.delete(token);
    }
}

export function requireUser(token) {
    const session = getSession(token);
    if (!session) {
        return { error: 'auth', status: 401 };
    }
    return { session };
}

export function requireAdmin(token) {
    const auth = requireUser(token);
    if (auth.error) {
        return auth;
    }
    if (auth.session.role !== 'admin') {
        return { error: 'forbidden', status: 403 };
    }
    return auth;
}

export function createUser(input) {
    const username = String(input.username || '').trim();
    const accessCode = String(input.accessCode || '');
    const role = input.role === 'admin' ? 'admin' : 'user';
    if (!username) {
        throw new Error('Username is required.');
    }
    if (accessCode.length < MIN_ACCESS_CODE_LENGTH) {
        throw new Error(`Access code must be at least ${MIN_ACCESS_CODE_LENGTH} characters.`);
    }
    const store = readStore();
    if (store.users.some((user) => normalizeUsername(user.username) === normalizeUsername(username))) {
        throw new Error('That username is already in use.');
    }
    const timestamp = nowIso();
    const user = {
        id: newId(),
        username,
        password: hashPassword(accessCode),
        role,
        active: input.active !== false,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    store.users.push(user);
    writeStore(store);
    return publicUser(user);
}

export function updateUser(id, patch) {
    const store = readStore();
    const index = store.users.findIndex((user) => user.id === id);
    if (index < 0) {
        throw new Error('User not found.');
    }
    const current = store.users[index];
    const username = patch.username !== undefined ? String(patch.username).trim() : current.username;
    if (!username) {
        throw new Error('Username is required.');
    }
    if (
        store.users.some(
            (user) => user.id !== id && normalizeUsername(user.username) === normalizeUsername(username)
        )
    ) {
        throw new Error('That username is already in use.');
    }
    if (patch.accessCode) {
        if (String(patch.accessCode).length < MIN_ACCESS_CODE_LENGTH) {
            throw new Error(`Access code must be at least ${MIN_ACCESS_CODE_LENGTH} characters.`);
        }
        current.password = hashPassword(String(patch.accessCode));
    }
    current.username = username;
    current.role = patch.role === 'admin' || patch.role === 'user' ? patch.role : current.role;
    if (typeof patch.active === 'boolean') {
        current.active = patch.active;
    }
    current.updatedAt = nowIso();
    store.users[index] = current;
    if (countAdmins(store.users) < 1) {
        throw new Error('At least one active admin is required.');
    }
    writeStore(store);
    return publicUser(current);
}

export function deleteUser(id) {
    const store = readStore();
    const nextUsers = store.users.filter((user) => user.id !== id);
    if (nextUsers.length === store.users.length) {
        throw new Error('User not found.');
    }
    if (countAdmins(nextUsers) < 1) {
        throw new Error('At least one active admin is required.');
    }
    store.users = nextUsers;
    writeStore(store);
}

export function generateBulkUsers(options) {
    const count = Math.floor(Number(options.count));
    if (count < 1 || count > 200) {
        throw new Error('Choose between 1 and 200 accounts.');
    }
    const prefix = String(options.prefix || 'user').trim().replace(/\s+/g, '') || 'user';
    const startAt = Math.max(1, Math.floor(Number(options.startAt) || 1));
    const pad = Math.max(3, String(startAt + count - 1).length);
    const store = readStore();
    const taken = new Set(store.users.map((user) => normalizeUsername(user.username)));
    const generated = [];
    let nextNumber = startAt;
    const timestamp = nowIso();
    while (generated.length < count) {
        if (nextNumber > startAt + count + 5000) {
            throw new Error('Could not find enough unused usernames.');
        }
        const username = `${prefix}${String(nextNumber).padStart(pad, '0')}`;
        nextNumber += 1;
        if (taken.has(normalizeUsername(username))) {
            continue;
        }
        taken.add(normalizeUsername(username));
        const accessCode = generateAccessCode(12);
        const user = {
            id: newId(),
            username,
            password: hashPassword(accessCode),
            role: 'user',
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        store.users.push(user);
        generated.push({ username, accessCode, role: 'user' });
    }
    writeStore(store);
    return generated;
}

export function changeOwnAccessCode(session, currentCode, newCode, confirmCode) {
    if (!currentCode || !newCode || !confirmCode) {
        throw new Error('Fill in all access code fields.');
    }
    if (newCode !== confirmCode) {
        throw new Error('New access code and confirmation do not match.');
    }
    if (newCode.length < MIN_ACCESS_CODE_LENGTH) {
        throw new Error(`New access code must be at least ${MIN_ACCESS_CODE_LENGTH} characters.`);
    }
    if (newCode === currentCode) {
        throw new Error('Choose a new access code that is different from the current one.');
    }
    const store = readStore();
    const user = store.users.find((entry) => entry.id === session.id);
    if (!user || !verifyPassword(currentCode, user.password)) {
        throw new Error('Current access code is incorrect.');
    }
    user.password = hashPassword(newCode);
    user.updatedAt = nowIso();
    writeStore(store);
}
