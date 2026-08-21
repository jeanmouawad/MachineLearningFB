const ATTEMPT_KEY = 'tm_demo_login_attempts';
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

interface AttemptState {
    count: number;
    firstAt: number;
}

function readAttempts(): AttemptState {
    try {
        const raw = sessionStorage.getItem(ATTEMPT_KEY);
        if (!raw) return { count: 0, firstAt: Date.now() };
        const parsed = JSON.parse(raw) as AttemptState;
        if (Date.now() - parsed.firstAt > WINDOW_MS) {
            return { count: 0, firstAt: Date.now() };
        }
        return parsed;
    } catch {
        return { count: 0, firstAt: Date.now() };
    }
}

function writeAttempts(state: AttemptState): void {
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(state));
}

export function isLoginThrottled(): boolean {
    const state = readAttempts();
    return state.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(): void {
    const state = readAttempts();
    writeAttempts({ count: state.count + 1, firstAt: state.firstAt });
}

export function clearLoginAttempts(): void {
    sessionStorage.removeItem(ATTEMPT_KEY);
}
