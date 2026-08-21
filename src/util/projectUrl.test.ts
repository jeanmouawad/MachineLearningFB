import { describe, it, expect } from 'vitest';
import { isSafeImageUri, mapProjectToUrl } from './projectUrl';

describe('mapProjectToUrl', () => {
    it('accepts 8-char codes against https API', () => {
        expect(mapProjectToUrl('Ab12Cd34', 'https://api.example.com')).toBe(
            'https://api.example.com/model/Ab12Cd34/project.zip'
        );
    });

    it('accepts localhost http for development', () => {
        expect(mapProjectToUrl('abcdefgh', 'http://localhost:9001')).toBe(
            'http://localhost:9001/model/abcdefgh/project.zip'
        );
    });

    it('rejects arbitrary http URLs', () => {
        expect(mapProjectToUrl('https://evil.example/malware.zip', 'https://api.example.com')).toBeUndefined();
    });

    it('rejects non-code strings', () => {
        expect(mapProjectToUrl('../etc/passwd', 'https://api.example.com')).toBeUndefined();
        expect(mapProjectToUrl('short', 'https://api.example.com')).toBeUndefined();
    });

    it('rejects non-https remote API bases', () => {
        expect(mapProjectToUrl('abcdefgh', 'http://evil.example')).toBeUndefined();
    });
});

describe('isSafeImageUri', () => {
    it('allows https and data:image', () => {
        expect(isSafeImageUri('https://cdn.example/a.png')).toBe(true);
        expect(isSafeImageUri('data:image/png;base64,aaa')).toBe(true);
    });

    it('rejects javascript and non-image data URIs', () => {
        expect(isSafeImageUri('javascript:alert(1)')).toBe(false);
        expect(isSafeImageUri('data:text/html,<script>')).toBe(false);
    });
});
