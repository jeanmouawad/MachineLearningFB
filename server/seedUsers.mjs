import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './hashPassword.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'data', 'users.json');
const now = '2026-08-23T00:00:00.000Z';

const demoCode = process.env.SEED_DEMO_CODE;
const adminUser = process.env.SEED_ADMIN_USER;
const adminCode = process.env.SEED_ADMIN_CODE;
if (!demoCode || !adminUser || !adminCode) {
    console.error('Set SEED_DEMO_CODE, SEED_ADMIN_USER, and SEED_ADMIN_CODE.');
    process.exit(1);
}

const store = {
    version: 3,
    updatedAt: now,
    users: [
        {
            id: 'seed-demo',
            username: 'Demo',
            password: hashPassword(demoCode),
            role: 'user',
            active: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: 'seed-admin',
            username: adminUser,
            password: hashPassword(adminCode),
            role: 'admin',
            active: true,
            createdAt: now,
            updatedAt: now,
        },
    ],
};

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, `${JSON.stringify(store, null, 2)}\n`);
console.log('Wrote', dest);
