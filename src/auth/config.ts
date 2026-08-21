/**
 * Demo gate credentials.
 * IMPORTANT: Any VITE_* value is embedded in the client JavaScript bundle and must be
 * treated as public. This is not server-side authentication.
 * Prefer setting VITE_DEMO_USERNAME / VITE_DEMO_ACCESS_CODE per environment and rotating
 * after each pilot. Defaults exist only for local/demo continuity.
 */
export const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME || 'Demo';
export const DEMO_ACCESS_CODE = import.meta.env.VITE_DEMO_ACCESS_CODE || 'UNICEF-DEMO';

export const AUTH_SESSION_KEY = 'tm_demo_authenticated';

export function hasDemoCredentialsConfigured(): boolean {
    return Boolean(DEMO_USERNAME && DEMO_ACCESS_CODE);
}
