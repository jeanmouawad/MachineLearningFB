import { AUTH_SESSION_KEY } from './config';

export function isAuthenticated(): boolean {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
}

export function login(): void {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
}

export function logout(): void {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
}

export function validateCredentials(username: string, accessCode: string, expectedUsername: string, expectedCode: string): boolean {
    return username.trim().toLowerCase() === expectedUsername.toLowerCase() && accessCode.trim() === expectedCode;
}
