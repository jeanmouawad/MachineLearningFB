/// <reference types="vitest" />
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'node:fs';
import path from 'node:path';

const MEDIAPIPE_HANDS_DIR = path.resolve(__dirname, 'node_modules/@mediapipe/hands');
const MEDIAPIPE_HANDS_URL = '/mediapipe/hands';

/** Rewrite remote GenAI / Teachable Machine CDNs to first-party static assets. */
const CDN_REWRITES: Array<[string, string]> = [
    ['https://store.gen-ai.fi/tm/models/hands', MEDIAPIPE_HANDS_URL],
    ['https://store.gen-ai.fi/tm/models', '/tm-models'],
    ['https://store.gen-ai.fi/tm/datasets/datasets.json', '/tm-models/empty-datasets.json'],
    ['https://tmstore.blob.core.windows.net/models', '/tm-models'],
];

function rewriteRemoteCdns(code: string): string | null {
    let next = code;
    let changed = false;
    for (const [from, to] of CDN_REWRITES) {
        if (next.includes(from)) {
            next = next.replaceAll(from, to);
            changed = true;
        }
    }
    return changed ? next : null;
}

function mediapipeHandsPlugin(): Plugin {
    const mimeTypes: Record<string, string> = {
        '.js': 'application/javascript',
        '.wasm': 'application/wasm',
        '.binarypb': 'application/octet-stream',
        '.data': 'application/octet-stream',
        '.tflite': 'application/octet-stream',
        '.bin': 'application/octet-stream',
        '.json': 'application/json',
    };

    return {
        name: 'local-ml-assets',
        enforce: 'pre',
        transform(code, id) {
            if (!id.includes('node_modules') && !id.includes('@genai-fi')) {
                // Still rewrite app source that hardcodes GenAI URLs (datasets, etc.)
            }
            const next = rewriteRemoteCdns(code);
            return next ? { code: next, map: null } : null;
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url?.split('?')[0] ?? '';
                if (!url.startsWith(`${MEDIAPIPE_HANDS_URL}/`)) {
                    return next();
                }

                const name = path.basename(url);
                const file = path.join(MEDIAPIPE_HANDS_DIR, name);
                if (!name || path.dirname(file) !== MEDIAPIPE_HANDS_DIR || !fs.existsSync(file)) {
                    return next();
                }

                res.setHeader('Content-Type', mimeTypes[path.extname(name)] || 'application/octet-stream');
                fs.createReadStream(file).pipe(res);
            });
        },
        closeBundle() {
            const dest = path.resolve(__dirname, 'dist/mediapipe/hands');
            fs.mkdirSync(dest, { recursive: true });
            for (const name of fs.readdirSync(MEDIAPIPE_HANDS_DIR)) {
                if (name.endsWith('.md') || name.endsWith('.d.ts') || name === 'package.json') {
                    continue;
                }
                const from = path.join(MEDIAPIPE_HANDS_DIR, name);
                if (fs.statSync(from).isFile()) {
                    fs.copyFileSync(from, path.join(dest, name));
                }
            }
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react(), mediapipeHandsPlugin()],
    optimizeDeps: {
        esbuildOptions: {
            plugins: [
                {
                    name: 'rewrite-ml-cdns',
                    setup(build) {
                        build.onLoad({ filter: /node_modules[\\/]@genai-fi[\\/].*\.js$/ }, async (args) => {
                            let contents = await fs.promises.readFile(args.path, 'utf8');
                            contents = rewriteRemoteCdns(contents) ?? contents;
                            return { contents, loader: 'js' };
                        });
                    },
                },
            ],
        },
    },
    build: {
        rollupOptions: {
            output: {
                inlineDynamicImports: mode === 'robot',
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        clearMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['cobertura', 'html'],
        },
        server: {
            deps: {
                inline: ['@genai-fi/base'],
            },
        },
    },
    resolve: {
        alias: {
            '@genaitm': path.resolve(__dirname, './src'),
            '@genai-fi/base/css/colours.module.css': path.resolve(__dirname, './src/theme/colours.module.css'),
        },
    },
}));
