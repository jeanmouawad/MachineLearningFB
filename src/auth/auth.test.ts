import { describe, it, expect, beforeEach } from 'vitest';
import { isAuthenticated, login, logout, validateCredentials } from './auth';
import { clearLoginAttempts, isLoginThrottled, recordFailedLogin } from './loginThrottle';
import { AUTH_SESSION_KEY } from './config';

describe('auth', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('starts unauthenticated', () => {
        expect(isAuthenticated()).toBe(false);
    });

    it('login and logout toggle session flag', () => {
        login();
        expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBe('true');
        expect(isAuthenticated()).toBe(true);
        logout();
        expect(isAuthenticated()).toBe(false);
    });

    it('validates credentials case-insensitively for username', () => {
        expect(validateCredentials('Demo', 'CODE', 'demo', 'CODE')).toBe(true);
        expect(validateCredentials('demo', 'wrong', 'demo', 'CODE')).toBe(false);
    });
});

describe('loginThrottle', () => {
    beforeEach(() => {
        sessionStorage.clear();
        clearLoginAttempts();
    });

    it('throttles after repeated failures', () => {
        for (let i = 0; i < 8; i++) recordFailedLogin();
        expect(isLoginThrottled()).toBe(true);
    });

    it('clears after successful clearLoginAttempts', () => {
        for (let i = 0; i < 8; i++) recordFailedLogin();
        clearLoginAttempts();
        expect(isLoginThrottled()).toBe(false);
    });
});
