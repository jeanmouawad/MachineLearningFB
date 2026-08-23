import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('server auth store', () => {
    let tempFile = '';

    beforeEach(() => {
        tempFile = path.join(os.tmpdir(), `tm-users-${process.pid}-${Date.now()}.json`);
        fs.copyFileSync(path.resolve('data/users.json'), tempFile);
        process.env.TM_USERS_FILE = tempFile;
    });

    afterEach(() => {
        delete process.env.TM_USERS_FILE;
        if (tempFile && fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    });

    it('rejects a wrong access code and does not put codes in the public list', async () => {
        const { authenticate, listPublicUsers } = await import('./authStore.mjs');
        const failed = authenticate('Demo', 'wrong-code', 'ip-1');
        expect(failed.error).toBe('invalid');
        const listed = JSON.stringify(listPublicUsers());
        expect(listed).not.toContain('password');
        expect(listed).not.toContain('UNICEF-DEMO');
    });

    it('creates a user and authenticates with the new access code', async () => {
        const { authenticate, createUser } = await import('./authStore.mjs');
        const created = createUser({ username: 'pilotZ', accessCode: 'Hello12345', role: 'user' });
        expect(created.username).toBe('pilotZ');
        const result = authenticate('pilotZ', 'Hello12345', 'ip-2');
        expect(result.user?.role).toBe('user');
        expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('changes an access code through the session account', async () => {
        const { authenticate, changeOwnAccessCode, createUser, getSession } = await import('./authStore.mjs');
        const created = createUser({
            username: 'pilotY',
            accessCode: 'OldCode123',
            role: 'user',
        });
        const login = authenticate('pilotY', 'OldCode123', 'ip-3');
        const session = getSession(login.token);
        expect(session?.id).toBe(created.id);
        changeOwnAccessCode(session, 'OldCode123', 'NewCode123', 'NewCode123');
        expect(authenticate('pilotY', 'OldCode123', 'ip-4').error).toBe('invalid');
        expect(authenticate('pilotY', 'NewCode123', 'ip-5').user?.id).toBe(created.id);
    });
});
