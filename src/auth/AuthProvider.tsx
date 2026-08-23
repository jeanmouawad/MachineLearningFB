import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchSession, loginRequest, logoutRequest, type SessionUser } from './api';

interface AuthContextValue {
    ready: boolean;
    user: SessionUser | null;
    login: (username: string, accessCode: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let memoryUser: SessionUser | null = null;

export function getAuthSession(): SessionUser | null {
    return memoryUser;
}

export function isAuthenticated(): boolean {
    return memoryUser !== null;
}

export function isAdmin(): boolean {
    return memoryUser?.role === 'admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<SessionUser | null>(null);

    const applyUser = (next: SessionUser | null) => {
        memoryUser = next;
        setUser(next);
    };

    const refresh = async () => {
        try {
            const data = await fetchSession();
            applyUser(data.user);
        } catch {
            applyUser(null);
        }
    };

    useEffect(() => {
        let active = true;
        fetchSession()
            .then((data) => {
                if (active) {
                    applyUser(data.user);
                }
            })
            .catch(() => {
                if (active) {
                    applyUser(null);
                }
            })
            .finally(() => {
                if (active) {
                    setReady(true);
                }
            });
        return () => {
            active = false;
        };
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            ready,
            user,
            login: async (username, accessCode) => {
                const data = await loginRequest(username, accessCode);
                applyUser(data.user);
            },
            logout: async () => {
                try {
                    await logoutRequest();
                } finally {
                    applyUser(null);
                }
            },
            refresh,
        }),
        [ready, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const value = useContext(AuthContext);
    if (!value) {
        throw new Error('AuthProvider is missing.');
    }
    return value;
}
