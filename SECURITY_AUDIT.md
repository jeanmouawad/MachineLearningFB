# SECURITY_AUDIT.md

**Application:** AI Teachable Machine (MachineLearningFB / FutureBots UNICEF demo)  
**Review date:** 2026-08-21  
**Scope:** Full repository (client SPA + static hosting configuration)  
**Reviewer role:** Defensive application / privacy / secure-architecture audit  

**Disclaimer:** This is a technical security and privacy review of the codebase. It is **not** a legal compliance certification (COPPA / GDPR / UK Children’s Code). Items marked for legal review require counsel or a DPO.

---

# Executive Summary

This product is a **browser-only Vite + React SPA**. There is **no first-party application backend, database, or multi-tenant user model** in this repository. Machine learning (image / pose / hand / speech) runs **on-device** via TensorFlow.js and `@genai-fi/classifier`. Optional classroom features use **PeerJS (WebRTC)** and an optional **external model API** (`VITE_APP_API`).

**Overall posture for a public school / minors deployment:** **NOT READY**.

The current “login” is a **client-side demo gate**. Credentials and the session flag live entirely in the browser. Anyone who can load the site can recover or bypass them. Separately, **peer collaboration routes are intentionally public** and historically allowed model download without enforcing the deploy password. Webcam/microphone samples can leave the device when P2P collect/input/share is used.

Several **confirmed HIGH issues were partially mitigated in this review** (deploy password enforcement, project URL allowlist, security headers, login throttling, safer drop handling, sample size checks, reduced error disclosure). **Core architectural gaps remain** (server-side auth, tenant model, peer authorization, child-account lifecycle).

---

# Architecture Overview

```text
Student/Teacher browser
        │
        ▼
  React SPA (Vite)  ── AuthGuard (sessionStorage flag) ──► /home, /:kind/:variant
        │
        ├── Local: Webcam / Mic ──► canvas / AudioExample ──► TF.js train/predict
        ├── Local: Save/Load project.zip (JSZip + file-saver)
        ├── Public routes (no AuthGuard):
        │     /deploy/p/:code   ── PeerJS ──► teacher peer tm-{code}
        │     /collect/:code/:i ── PeerJS ──► send webcam samples
        │     /input/:code      ── PeerJS ──► send input samples
        ├── Optional HTTP: VITE_APP_API ── POST/DELETE /model/{code}/
        └── External CDNs: store.gen-ai.fi, tmstore.blob.core.windows.net, tfhub.dev,
                           Google Fonts, PeerJS signaling, YouTube/Vimeo embeds
```

## Trust boundaries

| Boundary | What crosses it | Current control |
| -------- | --------------- | --------------- |
| Browser ↔ SPA bundle | All UI, credentials defaults, feature flags | Public |
| Browser ↔ PeerJS signaling | Session codes, WebRTC setup | Shared secret = 8-char code (+ deploy password for model request after fix) |
| Browser ↔ Peer data channel | Models, zips, image data-URLs | Knowledge of peer id `tm-{code}` |
| Browser ↔ `VITE_APP_API` | Project zips (upload/download) | Unauthenticated HTTP API (external) |
| Browser ↔ model CDNs | Base ML weights | Public HTTPS |
| AuthGuard | Route visibility only | `sessionStorage` boolean — **not a security boundary** |

**No database / ORM / RLS / school tenant layer exists in this repo.**

---

# Threat Model

## Assets

- Student webcam frames / faces, microphone audio, training samples, exported zips  
- Session codes / deploy passwords / PeerJS connections  
- Demo access credentials (public in practice)  
- Optional shared models on `VITE_APP_API`  
- Teacher classroom session integrity  

## Attacker profiles (relevant)

| Attacker | Realistic paths |
| -------- | --------------- |
| Anonymous internet | Bypass login; probe public peer routes; abuse CORS; load malicious `?project=` (mitigated); dependency CVE |
| Malicious / curious student | Guess/leak session code from QR; inject samples; request model if password leaked |
| Compromised demo account | Full app use (no per-user isolation) |
| Automated bot | Credential stuffing against demo gate; Peer connect spam |
| Malicious project / drop HTML | Untrusted zip / image URI handling |
| Supply chain | npm / Peer / CDN compromise |

## STRIDE (selected)

| Threat | Example |
| ------ | ------- |
| Spoofing | Forge `sessionStorage` auth; spoof peer as teacher |
| Tampering | Inject `add_sample` into teacher dataset; poison imported zip |
| Repudiation | No audit log of share / export / peer join |
| Information disclosure | Credentials in JS; password historically in query string; error JSON dump (fixed) |
| Denial of service | Huge data-URL samples over peer; unbounded training in-browser; zip bombs |
| Elevation of privilege | N/A roles — single shared demo gate; peer joins escalate to classroom data access |

---

# Findings Summary

| ID | Severity | Confidence | Category | Location | Finding | Status |
| -- | -------- | ---------- | -------- | -------- | ------- | ------ |
| SEC-001 | CRITICAL | CONFIRMED | Auth | `src/auth/*`, AuthGuard | Client-only auth; credentials in bundle; session forgeable | REQUIRES ARCHITECTURAL CHANGE |
| SEC-002 | CRITICAL | CONFIRMED | AuthZ / Privacy | `/collect`, `/input`, `/deploy/p` | Public peer routes; session code is sole gate for sample injection | REQUIRES ARCHITECTURAL CHANGE (partial hardening elsewhere) |
| SEC-003 | HIGH | CONFIRMED | AuthZ | `ShareProtocol.tsx` | Deploy password not enforced | **FIXED** |
| SEC-004 | HIGH | CONFIRMED | Privacy | `Output.tsx` | Deploy password in query string | **PARTIALLY FIXED** (hash fragment) |
| SEC-005 | HIGH | CONFIRMED | SSRF / ML | `loader.ts` `mapToURL` | Arbitrary `http` project URL load | **FIXED** |
| SEC-006 | HIGH | CONFIRMED | Config | `.htaccess` | `Access-Control-Allow-Origin: *` | **FIXED** |
| SEC-007 | HIGH | LIKELY | Privacy | `ShareProtocol` HTTP | Unauthenticated model zip upload to API | REQUIRES MANUAL REVIEW (API not in repo) |
| SEC-008 | MEDIUM | CONFIRMED | Headers | hosting configs | Missing CSP / security headers | **FIXED** (baseline CSP) |
| SEC-009 | MEDIUM | CONFIRMED | Info disclosure | `App.tsx` | Error boundary dumped `JSON.stringify(error)` | **FIXED** |
| SEC-010 | MEDIUM | CONFIRMED | Abuse | Login | No rate limit | **FIXED** (client throttle) |
| SEC-011 | MEDIUM | CONFIRMED | Input | `Behaviour.tsx` | `innerHTML` of dropped HTML | **PARTIALLY FIXED** (URI allowlist) |
| SEC-012 | MEDIUM | CONFIRMED | DoS | `SampleProtocol` | Unbounded peer sample payloads | **PARTIALLY FIXED** (size/type checks) |
| SEC-013 | MEDIUM | CONFIRMED | Supply chain | `package.json` | npm audit: critical/high deps | REQUIRES MANUAL REVIEW |
| SEC-014 | LOW | CONFIRMED | Privacy | defaults | P2P / collaboration on by default | DEFENSE-IN-DEPTH |
| SEC-015 | LOW | CONFIRMED | Crypto | `randomId` | Modulo bias (minor) | DEFENSE-IN-DEPTH |
| SEC-016 | MEDIUM | LIKELY | Child privacy | product design | No age gate, retention, parental consent flows | REQUIRES LEGAL/PRIVACY REVIEW |

---

# Critical Findings

## SEC-001 — Client-only authentication is not a security control

**Severity:** CRITICAL  
**Confidence:** CONFIRMED  
**CWE:** CWE-603 (Client-Side Enforcement), CWE-798 (Hard-coded Credentials)  
**OWASP:** A07 Identification and Authentication Failures  

**Affected files:**  
- `src/auth/config.ts`  
- `src/auth/auth.ts`  
- `src/components/AuthGuard/AuthGuard.tsx`  
- `src/views/Login/Login.tsx`  

### Description

Authentication compares username/access code **in the browser** against values embedded via `VITE_*` or source defaults. Success writes `sessionStorage['tm_demo_authenticated']='true'`. `AuthGuard` only checks that flag.

### Evidence

- Defaults and session key in `src/auth/config.ts`  
- Validation and `sessionStorage` in `src/auth/auth.ts`  
- Route gate in `AuthGuard.tsx`  

### Attack Scenario

An anonymous user opens DevTools and sets the session flag, or reads the expected access code from the JS bundle, and reaches classroom ML features without any server challenge.

### Impact

No trustworthy identity, no account isolation, no revocation. Unsuitable as the sole gate for minors’ classroom data.

### Recommended Fix

Introduce a real IdP / school SSO (or teacher-issued short-lived tokens) with **HttpOnly Secure SameSite cookies**, server session store, and **server-enforced** authorization on any remote share API. Until then, treat the app as an **unguarded public demo** and avoid storing children’s media remotely.

### Verification / Regression Test

- `src/auth/auth.test.ts` covers session flag behaviour.  
- Full fix requires integration tests against a backend (not present).

**Status:** REQUIRES ARCHITECTURAL CHANGE (throttle + docs added only).

---

## SEC-002 — Unauthenticated peer collect / input / deploy routes expose children’s media paths

**Severity:** CRITICAL (for kids’ deployments using collaboration)  
**Confidence:** CONFIRMED  
**CWE:** CWE-306 (Missing Authentication for Critical Function)  
**OWASP:** API1 Broken Object Level Authorization / A01 Broken Access Control  

**Affected files:**  
- `src/App.tsx` (public routes)  
- `src/workflow/ClassEntry/ClassMenu.tsx` (`/collect/...`)  
- `src/workflow/Input/RemoteInput.tsx` (`/input/...`)  
- `src/components/PeerDeployer/SampleProtocol.tsx`  

### Description

Routes `/collect/:code/:classIndex`, `/input/:code`, and `/deploy/p/:code` are **outside** `AuthGuard`. Anyone who obtains the 8-character `sessionCode` (QR, screenshot, shoulder-surf) can join the PeerJS room `tm-{code}` and:

- Push webcam frames into the teacher’s training set (`add_sample`)  
- After SEC-003 fix: pull the project only with the deploy password  

### Attack Scenario

A student photographs a classmate’s collect QR and sends unwanted images into another class’s dataset, or joins a live session and observes shared model content.

### Impact

Cross-student / cross-class media injection; classroom disruption; privacy harm for minors.

### Recommended Fix

- Authenticate peer joins (token bound to session + role).  
- Require deploy password (or separate collect token) on **sample** events, not only model requests.  
- Short-lived codes; teacher “session lock”; visible participant list.  
- Default `usep2p` / `enableCollaboration` **off** for public builds.  

**Status:** REQUIRES ARCHITECTURAL CHANGE (sample size/type hardening applied).

---

# High Findings

## SEC-003 — Deploy password was never checked (FIXED)

**Severity:** HIGH  
**Confidence:** CONFIRMED  
**CWE:** CWE-287  
**Affected:** `src/components/PeerDeployer/ShareProtocol.tsx`, `ProjectProtocol.tsx`  

Previously the client sent `password` on `request`, but the host ignored it and returned the project zip to any peer knowing the session code.

**Fix applied:** Host compares `data.password` to `sessionPassword` and refuses on mismatch.

**Regression:** Manual peer deploy with wrong `#p=` must not receive a project; correct password must succeed.

**Status:** FIXED  

---

## SEC-004 — Deploy password in URL query string (PARTIALLY FIXED)

**Severity:** HIGH → residual MEDIUM  
**Affected:** `src/workflow/Output/Output.tsx`  

Password moved from `?p=` to `#p=` (hash) to reduce leakage via Referer / CDN access logs. Still visible in browser history and shoulder-surfing.

**Status:** PARTIALLY FIXED  

---

## SEC-005 — Arbitrary remote project URL fetch (FIXED)

**Severity:** HIGH  
**CWE:** CWE-918 (SSRF-like client fetch) / untrusted model load  
**Affected:** `src/workflow/ImageWorkspace/loader.ts`  

`?project=https://…` previously fetched any URL into JSZip / TF.js.

**Fix applied:** `mapProjectToUrl` allows only 8-char codes against an https (or localhost http) `VITE_APP_API` base.

**Tests:** `src/util/projectUrl.test.ts`  

**Status:** FIXED  

---

## SEC-006 — Wildcard CORS on static hosting (FIXED)

**Severity:** HIGH (for any non-public assets; increases abuse surface)  
**Affected:** `public/.htaccess`  

Removed `Access-Control-Allow-Origin: *`. Added baseline security headers + CSP.

**Status:** FIXED  

---

## SEC-007 — Unauthenticated HTTP model share API

**Severity:** HIGH  
**Confidence:** LIKELY (API implementation out of repo)  
**Affected:** `src/workflow/ImageWorkspace/ShareProtocol.tsx`  

When `shareModel` is true, the SPA POSTs project zips (optionally with samples) to `{VITE_APP_API}/model/{code}/` with **no auth header**.

**Recommendation:** Require teacher bearer token; short TTL; encrypt at rest; never enable for minors without DPA; default off.

**Status:** REQUIRES MANUAL REVIEW  

---

# Medium Findings

## SEC-008 — Missing security headers (FIXED baseline)

Added via `.htaccess` and `staticwebapp.config.json`: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`.

CSP still allows `'unsafe-eval'` / `'wasm-unsafe-eval'` (typically required by TF.js) and broad `connect-src https: wss:` for Peer/CDN — tighten when API hosts are known.

**Status:** FIXED (with residual hardening debt)

## SEC-009 — Verbose client error dump (FIXED)

`App.tsx` no longer renders `JSON.stringify(error)` to users.

## SEC-010 — Login abuse (FIXED client-side)

`src/auth/loginThrottle.ts` limits failed attempts per tab session.

## SEC-011 — Dropped HTML `innerHTML` (PARTIALLY FIXED)

Image URI validated via `isSafeImageUri` before use.

## SEC-012 — Peer sample DoS (PARTIALLY FIXED)

Reject non-`data:image/` and payloads &gt; ~2MB.

## SEC-013 — Dependency vulnerabilities

`npm audit` (2026-08-21) reported **13** issues including **critical** vitest (dev) and **high** `react-router` / `react-router-dom`, `ws`, `postcss`, `form-data`, etc.

**Action:** Upgrade `react-router` / `react-router-dom` to patched releases after changelog review; keep vitest UI off in CI; schedule regular `npm audit` in pipeline.

**Status:** REQUIRES MANUAL REVIEW  

---

# Low Findings

## SEC-014 — Collaboration features enabled by default

`configuration.json`: `usep2p: true`, `enableCollaboration: true`, `allowDeploy: true`. Prefer secure defaults **off** for public child-facing builds.

## SEC-015 — `randomId` modulo bias

`crypto.getRandomValues` then `% ALLOWED.length` is slightly biased. Prefer rejection sampling for session secrets.

---

# Privacy Findings

| Data | Where | Leaves device? | Notes |
| ---- | ----- | -------------- | ----- |
| Webcam frames | Training / preview | **Local** unless collect/input/deploy/share | Faces of minors |
| Mic audio | Speech mode | Local unless shared in zip | Voice of minors |
| Labels / class names | Jotai state / zip | If shared | May include names |
| Session code | URL / QR | Shared in classroom | Treat as secret |
| Demo username | Login form | Not persisted server-side | |
| Analytics | None wired | — | Privacy copy claims no tracking |

**Data minimization:** Good for core offline training. Risk concentrates on **optional collaboration and HTTP share**.

---

# Child-Safety / Child-Privacy Findings

| ID | Item | Type |
| -- | ---- | ---- |
| CP-1 | No age assurance / parental consent flow | Legal/privacy review |
| CP-2 | Webcam/mic used for ML without guardian-facing consent UX beyond generic privacy text | Design + legal |
| CP-3 | Public collect QR can expose one child’s camera stream path to another device | Technical + classroom policy |
| CP-4 | Project zip may contain facial images if samples saved | Technical safeguard: warn before share; default exclude samples (`shareSamples`) |
| CP-5 | Hardcoded/shared demo account means no per-child deletion / export rights machinery | Architectural |

Distinguish: **technical safeguards** (defaults off, password on peer, no remote fetch) vs **legal obligations** (consent, retention, DPIA) — latter not validated by this code review.

---

# AI/ML Security Findings

| Risk | Assessment |
| ---- | ---------- |
| Training locality | Strong — TF.js in browser |
| Untrusted zip/model import | Present via Open dialog + peer + API; treat as untrusted; JSZip path safety depends on `@genai-fi/classifier` |
| Model poisoning | Peer `add_sample` can poison classroom datasets (SEC-002) |
| Resource exhaustion | Browser-side; soft limits on peer samples added; no hard epoch/sample caps enforced app-wide |
| Remote base models | Fetched from Azure blob / TF Hub / gen-ai.fi — supply-chain trust |
| Unsafe pickle/joblib | N/A (browser TF.js / custom format) |

---

# Authorization Matrix

| Capability | Anonymous | “Logged-in” demo user | Teacher (same browser session) | Server role |
| ---------- | --------- | --------------------- | ------------------------------ | ----------- |
| View login | ✓ | ✓ | ✓ | n/a |
| Use trainer UI | ✗ (UI only) | ✓ | ✓ | n/a |
| Forge session | ✓ | ✓ | ✓ | n/a |
| Join `/collect` with code | ✓ | ✓ | ✓ | n/a |
| Request deploy model w/o password | ✗ after fix | ✗ | host only | n/a |
| Upload zip to API | if share enabled | same | same | **must enforce** |
| Access another school’s data | n/a — no tenants | | | |

There are **no Student / Teacher / Admin roles** in code.

---

# API Endpoint Review

| Client call | Auth | Notes |
| ----------- | ---- | ----- |
| `POST {API}/model/{code}/` | None in SPA | SEC-007 |
| `DELETE {API}/model/{code}/` | None | SEC-007 |
| `GET {API}/model/{code}/project.zip` | None | After fix, only via allowlisted code |
| PeerJS signaling | Peer key (often public `peerjs`) | |
| Peer data events | Session code (+ password for `request`) | |

No first-party REST surface in-repo.

---

# Dependency Findings

See SEC-013. Prioritize:

1. `react-router` / `react-router-dom` high severity advisories  
2. Ensure vitest UI / preview servers are not exposed  
3. Pin and upgrade `@genai-fi/*` when security fixes publish  

---

# Infrastructure Findings

| Item | Finding |
| ---- | ------- |
| Hosting | Static Hostinger deploy; SPA `.htaccess` |
| Secrets in CI | Azure Pipelines may use `GITHUB_TOKEN` for private npm — keep scoped |
| Docker | Not present |
| DB | Not present |
| CDN CORS | Wildcard removed |

---

# Security Headers Review

| Header | Status |
| ------ | ------ |
| CSP | Added (relaxed for TF.js / embeds) |
| HSTS | Rely on host/CDN; not set in `.htaccess` (optional add) |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera/mic self; geo/payment denied |
| COOP/COEP | Not set (may break some wasm isolation patterns) |

---

# Logging / Monitoring Review

- No centralized security logging.  
- `console.error` / `console.debug` used for share failures.  
- Avoid logging sample data-URLs or passwords (currently not logged).  
- Recommend: teacher-visible peer join events; failed deploy-password attempts (count only).

---

# Webcam / Microphone Data-Flow Assessment

```text
getUserMedia (camera) → @genai-fi/base Webcam → canvas
  → local classState samples / preview
  → optional PeerJS add_sample (data:image…) to teacher
  → optional zip save / HTTP share

getUserMedia (audio) → AudioRecorder → AudioExample
  → local speech training
  → optional include in zip if sharing samples
```

Streams should stop when capture UI closes (library-dependent — verify UX “camera off” indicators before pilots).

---

# Recommended Security Architecture (target)

1. **Teacher-authenticated control plane** (SSO or magic link).  
2. **Ephemeral classroom sessions** with rotating codes + role-bound peer tokens.  
3. **Private-by-default** projects; explicit consent before any remote share.  
4. **Server-side** authorize model upload/download; encrypt zips; TTL delete.  
5. **No child PII** beyond classroom nickname; no persistent face cloud storage.  
6. **CSP allowlist** of Peer and API hosts; drop broad `https:`.  
7. **Security tests** in CI for authz and URL allowlists.

---

# Prioritized Remediation Roadmap

### P0 — Before any public child deployment

1. Replace client-only auth with server sessions (SEC-001).  
2. Authenticate / authorize peer collect & deploy (SEC-002).  
3. Keep deploy password enforcement (SEC-003) and rotate demo codes.  
4. Disable HTTP model share or put auth in front of `VITE_APP_API` (SEC-007).  
5. Patch high/critical npm advisories affecting runtime (SEC-013).  

### P1 — Before pilot with real students

1. Defaults: P2P/collaboration **off**; clear camera/mic consent copy.  
2. Collect tokens separate from session code; expiry.  
3. Tighten CSP `connect-src` to known hosts.  
4. DPIA / COPPA–GDPR children’s guidance with counsel (SEC-016).  
5. Teacher controls: kick peer, pause collect, wipe samples.  

### P2 — Hardening

1. Rejection-sampling IDs; stronger entropy.  
2. Sample/training quotas; zip size limits.  
3. HSTS; COOP where compatible.  
4. Structured security event logging.  

### P3 — Maturity

1. Formal multi-tenant school model.  
2. Dependency scanning gate in CI.  
3. Periodic red-team of peer protocol.  
4. Parent/teacher data subject workflows.  

---

# Changes Made in This Review

| Change | Files |
| ------ | ----- |
| Enforce peer deploy password | `src/components/PeerDeployer/ShareProtocol.tsx` |
| Password in URL hash + `noopener` | `src/workflow/Output/Output.tsx`, `ProjectProtocol.tsx` |
| Project URL allowlist | `src/util/projectUrl.ts`, `loader.ts`, tests |
| Peer sample size/type checks | `SampleProtocol.tsx` |
| Login throttling | `loginThrottle.ts`, `Login.tsx`, tests |
| Safer image URI from HTML drops | `Behaviour.tsx` |
| Remove error dump | `App.tsx` |
| Remove CORS `*`; add headers/CSP | `public/.htaccess`, `staticwebapp.config.json` |
| Auth documentation comments | `src/auth/config.ts` |

---

# Remaining Risks

- Client auth still bypassable (SEC-001).  
- Collect/input still code-gated only (SEC-002).  
- External API auth unknown (SEC-007).  
- CSP still permissive for TF.js / wildcards.  
- Dependency CVEs not fully remediated.  
- No per-student accounts or deletion pipeline.  

---

# Final Pre-Production Security Checklist

- [ ] Server-side authentication for all non-public features  
- [ ] Peer join authorization + audit  
- [ ] Collaboration defaults off for public builds  
- [ ] `VITE_APP_API` authenticated + TLS + retention policy  
- [ ] Rotated demo credentials / no shared long-lived secrets  
- [ ] npm audit clean (or risk-accepted) for production deps  
- [ ] CSP tightened to concrete Peer/API hosts  
- [ ] Child privacy notice + consent UX reviewed by counsel  
- [ ] Camera/mic indicators and stop-on-exit verified  
- [ ] Incident response contact for school pilots  

---

# Verdict

```text
OVERALL SECURITY READINESS: NOT READY

Critical findings remaining: 2 (SEC-001, SEC-002) — architectural
High findings remaining: 1 (SEC-007 API auth unknown) + dependency patch debt
Medium findings remaining: several residual (CSP looseness, HTML drop, peer DoS soft limits)
Low findings remaining: 2+

Top 5 risks:
1. Client-only / forgeable authentication for a minors-facing demo
2. Public PeerJS collect/input paths keyed only by short session codes
3. Unauthenticated remote model API when sharing is enabled
4. Children’s face/voice data leaving the device via P2P or zip share
5. Runtime dependency advisories (e.g. react-router) until upgraded

Top 5 actions before allowing real students:
1. Deploy real server authentication and kill shared demo credentials as a security boundary
2. Require authenticated, expiring tokens for peer collect/deploy; default P2P off
3. Put authentication and retention controls on any model/share API
4. Complete a child-data DPIA / legal review; minimize remote transfer of samples
5. Patch production dependency CVEs and redeploy with security headers verified live
```
