import crypto from 'node:crypto';

export const PBKDF2_ITERATIONS = 210_000;
export const PBKDF2_KEYLEN = 32;
export const PBKDF2_DIGEST = 'sha256';
export const MIN_ACCESS_CODE_LENGTH = 8;
export const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
}

export function hashPassword(password, salt = crypto.randomBytes(16)) {
    const hash = crypto.pbkdf2Sync(Buffer.from(password, 'utf8'), salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
    return {
        algo: 'pbkdf2-sha256',
        iterations: PBKDF2_ITERATIONS,
        salt: salt.toString('base64url'),
        hash: hash.toString('base64url'),
    };
}

export function verifyPassword(password, stored) {
    if (!stored || stored.algo !== 'pbkdf2-sha256' || !stored.salt || !stored.hash) {
        return false;
    }
    const iterations = Number(stored.iterations) || PBKDF2_ITERATIONS;
    const salt = Buffer.from(stored.salt, 'base64url');
    const expected = Buffer.from(stored.hash, 'base64url');
    const actual = crypto.pbkdf2Sync(Buffer.from(password, 'utf8'), salt, iterations, expected.length, PBKDF2_DIGEST);
    if (actual.length !== expected.length) {
        return false;
    }
    return crypto.timingSafeEqual(actual, expected);
}

export function generateAccessCode(length = 12) {
    const bytes = crypto.randomBytes(length);
    return Array.from(bytes, (byte) => ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length]).join('');
}

export function newId() {
    return crypto.randomUUID();
}
