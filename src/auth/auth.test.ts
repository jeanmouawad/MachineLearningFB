import { describe, it, expect, beforeEach } from 'vitest';
import { isAdmin, isAuthenticated, getAuthSession } from './auth';
import { clearLoginAttempts, isLoginThrottled, recordFailedLogin } from './loginThrottle';

describe('auth', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('starts unauthenticated', () => {
        expect(isAuthenticated()).toBe(false);
        expect(isAdmin()).toBe(false);
        expect(getAuthSession()).toBeNull();
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
