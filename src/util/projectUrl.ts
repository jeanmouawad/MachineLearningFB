/**
 * Resolve a project identifier to a fetch URL.
 * Only 8-character session codes against the configured API base are allowed —
 * arbitrary http(s) URLs are rejected to prevent SSRF / untrusted zip loading.
 */
export function mapProjectToUrl(project: string, apiBase = import.meta.env.VITE_APP_API): string | undefined {
    const code = project.trim();
    if (!/^[a-z0-9]{8}$/i.test(code)) {
        return undefined;
    }
    if (!apiBase || typeof apiBase !== 'string') {
        return undefined;
    }
    let base: URL;
    try {
        base = new URL(apiBase);
    } catch {
        return undefined;
    }
    if (base.protocol !== 'https:' && !(base.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/i.test(base.hostname))) {
        return undefined;
    }
    return `${base.origin}/model/${code}/project.zip`;
}

export function isSafeImageUri(uri: string): boolean {
    try {
        if (uri.startsWith('data:image/')) {
            return !uri.slice(0, 64).toLowerCase().includes('script');
        }
        const parsed = new URL(uri);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
        return false;
    }
}
