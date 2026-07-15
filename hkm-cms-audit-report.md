# HKM Ministries Church Management System — Senior Engineering & Security Audit

**Repository:** `mmbuiya/hkm-ministries-church-management-system`
**Audit date:** July 14, 2026
**Commits reviewed:** 29 (HEAD `9152da1`, last push same-day)
**Live deployment referenced in README:** `https://mmbuiya.github.io/hkm-ministries-church-management-system/`
**Method:** Full clone and static review of source, git history, CI config, and dependency graph (`npm audit` against the committed lockfile). No live endpoints were queried or tested as part of this review.

---

## ⚠️ Immediate Action Required

This repository currently has **live, working production credentials committed in plaintext**, including a **Hasura admin secret** (full, unrestricted read/write/delete access to the entire database, bypassing every permission rule) hardcoded directly into client-side source that ships to every visitor's browser. Because this repo is public and is actively built and deployed to GitHub Pages by its own CI workflow, this is not a theoretical finding — it is very likely live right now.

**Before anything else:**
1. Rotate the Hasura admin secret and the Clerk secret key immediately, from their respective dashboards.
2. Treat both as fully compromised — assume they have been harvested already; rotation, not just removal from the repo, is what actually closes the hole (git history retains the old values regardless of future commits).
3. Consider taking the GitHub Pages deployment offline until at least the admin-secret and super-admin-elevation issues (below) are fixed and secrets are rotated.
4. If this system holds real member/congregant PII or financial (tithe/offering) records, review Hasura/Firebase access logs for unusual activity, and consider your obligations under applicable data-protection law (e.g., Kenya's Data Protection Act, 2019) if there's any indication the data was accessed by someone other than the church.

The rest of this report explains why, in detail, and how to fix it.

---

## 1. Repository Structure

```
hkm-ministries-church-management-system/
├── App.tsx                        # Root component, session/auth glue
├── components/                    # 101 files, flat — no module/domain folders
├── hooks/                         # 18 custom hooks (mostly Hasura data hooks)
├── services/
│   ├── graphql/                   # 10 Hasura query/mutation files (Members, Finance, etc.)
│   ├── security.ts                # Full client-side security library (626 lines)
│   ├── storage.ts                 # Legacy local-storage "database" + auth (dead code)
│   ├── firebaseService.ts / firebaseConfig.ts   # Firebase (partially still wired)
│   ├── pbService.ts / pocketbase.ts             # PocketBase (fully dead code)
│   └── googleOAuth.ts, offlineSync.ts, SecureStorage.ts
├── electron/                      # Desktop wrapper (main, preload, safeStorage helper)
├── scripts/                       # 11 one-off Node scripts for provisioning Hasura tables
├── config/googleOAuth.ts
├── public/                        # icon, 404.html (SPA redirect trick for GH Pages)
├── .github/workflows/deploy.yml   # Single CI job: build → deploy to GitHub Pages
├── .continue/agents/*.yaml        # Editor-tooling config (Continue.dev), placeholder keys only
├── firestore.rules                # Firebase security rules — well-written, but for a backend the app no longer really uses
├── hkm-church-app.zip              # 484 KB — a **committed production build artifact**
├── .env / .env.example            # .env is tracked in git and contains live secrets
├── package.json / package-lock.json
└── 6 top-level *.md docs (feature-specific, no architecture doc)
```

**Scale:** 101 component files, 18 hooks, 20 service files, ~25,100 lines of TypeScript/TSX, 3.9 MB repo (excluding `node_modules`).

**Observations:**
- All 101 components live in a single flat `components/` directory regardless of domain (Members, Finance, Equipment, Visitors, SMS, Branches, Auth, System). At this scale that's already hard to navigate; it will get worse.
- Three parallel backend integrations are present in the tree (Hasura, Firebase, PocketBase) plus a fourth, fully self-built local-storage auth/database layer (`services/storage.ts`). Only one (Hasura) is fully live; see §2 and §9.
- Documentation is six separate feature-announcement markdown files at the repo root (`ENTERPRISE_REGISTRATION_SYSTEM.md`, `PERMISSION_REQUEST_SYSTEM.md`, etc.) with no single architecture or onboarding document, and no `/docs` folder.
- A compiled production bundle (`hkm-church-app.zip`) and a `.env` file with live secrets are both tracked in git — both should never be committed.

---

## 2. Architecture Assessment

**Current (live) architecture:**
- **Client:** React 18 + TypeScript SPA, built with Vite, additionally packaged as a Windows/macOS/Linux desktop app via Electron + `electron-builder`.
- **Auth:** Clerk (hosted auth-as-a-service) — migrated from Firebase per the comment at the top of `AuthContext.tsx` ("Replaces Firebase with Clerk for better reliability and enterprise features").
- **Data:** Apollo Client talking GraphQL (queries, mutations, and WebSocket subscriptions) directly to a Hasura Cloud instance (`sunny-zebra-57.hasura.app` — the naming pattern is characteristic of Hasura Cloud's free tier).
- **Deployment:** Static SPA built by GitHub Actions and pushed to GitHub Pages on every push to `main`.
- **AI features:** Google Gemini (`@google/genai`) instantiated directly in browser components for SMS drafting / content generation.

**The defining architectural problem:** there is no backend of this application's own. It is a thick client that talks straight to a third-party GraphQL data platform, and the *only* thing standing between "signed-in user" and "full admin access to every table" is supposed to be Hasura's row/column permission system. That permission system is completely bypassed because the client authenticates every request — including anonymous ones, before any Clerk sign-in — with a hardcoded Hasura **admin** secret (§3.1). In effect, the real access-control boundary for this system currently does not exist; every authorization decision in the UI (`canEdit`, `canView`, role checks) is a cosmetic suggestion the browser is free to ignore, because the browser already holds the master key.

**Legacy layering:** The codebase shows clear evidence of at least three sequential pivots without cleanup:
1. An original Google AI Studio-style scaffold (import-map + `esm.sh` script tag still present in `index.html`, `metadata.json` present at repo root) — now inert but never removed.
2. A Firebase-based iteration (Firestore rules, `firebaseService.ts`, a fully self-built local password-hashing/session/rate-limiting/2FA library in `services/storage.ts` + `services/security.ts`) — largely superseded but still partly wired in (`usePermissionRequest`, `useRealtimeData`, `MainLayout` all still import it).
3. A PocketBase-based iteration (`pbService.ts`, `pocketbase.ts`) — entirely dead; not imported anywhere else in the app.
4. The current Hasura + Clerk iteration, which is what's actually live.

This kind of churn is normal for a fast-moving, AI-assisted solo project. The problem isn't that it happened — it's that none of the earlier layers were ever decommissioned, so the app now ships four different auth/storage systems' worth of code, dependencies, and attack surface, while only enforcing security consistently in *none* of them.

**Real-time data:** Recent commits show a deliberate, sensible engineering response to a real constraint — Hasura Cloud free tier's auto-pause/cold-start behavior — by adding an HTTP query fallback alongside GraphQL subscriptions. That's a good instinct; it's just being applied on top of an already-broken authorization model.

---

## 3. Security Assessment

**Overall grade: F — critical, live exploitable issues.** This is the most severe part of the report; the rest of the codebase's problems are ordinary technical debt by comparison.

### 3.1 CRITICAL — Hasura admin secret hardcoded and shipped to every browser

`components/AuthorizedApolloProvider.tsx`:
```ts
const adminSecret = import.meta.env.VITE_HASURA_ADMIN_SECRET
  || 'sC2GxIp9LT3Uis53DfnNQW1gpm47kOhb6iO32mSFYgm79h8ct4H8j3ZIZfyoheei';
...
headers: { ...headers, 'x-hasura-admin-secret': adminSecret }
```
This header is attached to **every** HTTP and WebSocket GraphQL request the app makes — for both queries and mutations — regardless of whether a user is signed in. The `VITE_` prefix means Vite inlines this value into the built JavaScript bundle; anyone who opens dev tools, views page source, or downloads the deployed site can read it directly out of the shipped code. The same literal secret is additionally hardcoded as a fallback (so it's live even with no `.env` at all) and is repeated verbatim across **14 files** in this repository, including the checked-in `.env` and 11 of the one-off scripts in `scripts/`.

The Hasura admin secret is not a scoped credential — it disables Hasura's entire permission system for the request that carries it. Practically: anyone can point any GraphQL client at `https://sunny-zebra-57.hasura.app/v1/graphql` with this header and read, modify, or delete every row in every table — members, financial transactions, tithe records, visitor data, staff accounts, everything — with no authentication of any kind.

**Fix:** Never send the admin secret from the browser. Configure Hasura for JWT-based auth using Clerk's session token (Clerk can mint a JWT with a custom template containing `https://hasura.io/jwt/claims`), and define real per-role Hasura permissions (`Guest`, `Member`, `Data Personnel`, `Admin`, `Super Admin`) on each table. Example of the corrected provider:

```ts
// AuthorizedApolloProvider.tsx — corrected
import { useAuth } from '@clerk/clerk-react';

const httpLink = createHttpLink({ uri: import.meta.env.VITE_HASURA_GRAPHQL_URL });

const authLink = setContext(async (_, { headers }) => {
  const token = await getClerkSessionToken(); // Clerk JWT, Hasura template
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});
```
Any admin-only operation (bulk provisioning scripts, migrations) should run from a trusted server/CI context using a secret pulled from a secret manager or GitHub Actions secret — never from code that ships to a browser.

### 3.2 CRITICAL — Client-controlled Super Admin wildcard elevation

`components/AuthContext.tsx`, on every profile sync:
```ts
const superAdminEnv = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';
const superAdminEmails = superAdminEnv.split(',').map(e => e.trim().toLowerCase());
const allowAllSuperAdmin = superAdminEmails.includes('*');
...
const isSuperAdminEmail = email && (
  allowAllSuperAdmin ||
  superAdminEmails.includes(email.toLowerCase()) ||
  HARDCODED_SUPER_ADMINS.includes(email.toLowerCase())
);
if (isSuperAdminEmail && hUser.role !== 'Super Admin') {
  // auto-elevates this account to Super Admin and writes it back to the DB
}
```
The tracked `.env` file contains:
```
VITE_SUPER_ADMIN_EMAIL=*,nissimasher2019@gmail.com,njoros2025@gmail.com
```
The literal `*` in that value means `allowAllSuperAdmin` evaluates to `true`. As written, **every account that signs in — new or existing — is automatically elevated to `Super Admin`**, and that elevation is written back to Hasura using the already-open admin-secret connection. This is independent of, and additive to, §3.1: even if the admin secret were fixed, this logic determines the *application's own* notion of who is a Super Admin entirely client-side, based on an env value that ships in the bundle and can be trivially spoofed by anyone running the app against the real backend.

There's also a related, currently unreachable but still concerning artifact: `components/SuperAdminLogin.tsx` renders a form whose own body prints the correct credentials on screen (`Debug Info — Remove in production: Email: {config.email} / Access Code: {config.accessCode} / Secret Key: {config.secretKey}`). This component isn't currently mounted anywhere reachable from the app (dead code today), but it's a clear signal of the pattern above — debug/test scaffolding that says "remove in production" and wasn't.

**Fix:** Delete the client-side email/wildcard elevation logic entirely. Role assignment must happen server-side — e.g., a Hasura Action or a small serverless function, invoked with real authorization checks, that only a genuine existing Super Admin can call to promote another user. Never let the client decide its own privilege level, and never ship a literal `*` (or any real admin email list) into a public bundle.

### 3.3 HIGH — Known critical CVE in the exact Clerk SDK versions in use

`npm audit` against the committed lockfile:

| Package | Locked version | Vulnerable range | Severity | Issue |
|---|---|---|---|---|
| `@clerk/shared` | 3.41.1 | `≥3.0.0-canary … <3.47.4` | **Critical** | Middleware-based route protection bypass |
| `@clerk/clerk-react` | 5.59.2 | `5.9.0 – 5.61.5` | High | Authorization bypass combining org/billing/reverification checks |
| `protobufjs` (transitive, via Firebase) | ≤7.6.2 | `<7.5.5` for the RCE | **Critical** | Arbitrary code execution via generated message code |

Given this app's entire authentication is Clerk, running a version with a disclosed authorization-bypass CVE compounds §3.1/§3.2 rather than existing in isolation.

**Fix:** `npm install @clerk/clerk-react@latest @clerk/shared@latest` (patched at ≥5.61.6 / ≥3.47.4 respectively; latest published at audit time was `5.61.3`+ — re-check before pinning), and update Firebase to pull in a patched `protobufjs`/`undici`.

### 3.4 MEDIUM — Full `npm audit` summary

20 known vulnerabilities in the current dependency tree: **2 critical, 7 high, 11 moderate.**

| Package | Severity | Notes |
|---|---|---|
| `undici` (via `@firebase/auth`) | High | DoS via decompression bomb, request smuggling, cert validation bypass |
| `ws` | High | Uninitialized memory disclosure, memory-exhaustion DoS |
| `lodash` | High | Prototype pollution / code injection via `_.template`, `_.unset`, `_.omit` |
| `minimatch` | High | ReDoS via crafted glob patterns |
| `@grpc/grpc-js` | High | Malformed-request crash (server & client) |
| `js-cookie` | High | Prototype hijack enabling cookie-attribute injection |

Run `npm audit fix` for the parts that resolve without breaking changes, and plan a deliberate upgrade pass (Clerk, Firebase) for the rest.

### 3.5 MEDIUM — Secrets baked into the production build with no CI-level separation

`.github/workflows/deploy.yml` has no `env:` block; the build step (`npm run build`) uses whatever `.env` is checked into the repo at build time. Since GitHub Pages serves static files with no server-side logic, **the deployed production bundle bakes in whatever is in the tracked `.env`** — including the admin secret and the super-admin wildcard, per §3.1/§3.2. There's no distinction in this pipeline between "value safe to ship to a browser" and "value that must stay server-side."

`vite.config.ts` also explicitly forces a non-`VITE_`-prefixed secret into the client bundle:
```ts
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
},
```
Vite's `VITE_` prefix convention exists specifically to make "this is safe for the browser" opt-in and explicit; this `define` block deliberately routes around that for an AI provider key.

### 3.6 MEDIUM — Gemini API key used directly from the browser

`AiFeaturesPage.tsx`, `SendVisitorSmsModal.tsx`, `ServiceDetailsPage.tsx`, `ComposeSmsPage.tsx` all do:
```ts
const ai = new GoogleGenAI({ apiKey });
```
with `apiKey` sourced from `VITE_AI_API_KEY` or a per-org key stored in app settings. Any Google GenAI key used this way is extractable from the bundle/network tab and can be used by anyone to run inference against the church's quota/billing, independent of the app's own access control.

**Fix:** Proxy Gemini calls through a small server-side function (Cloudflare Worker, Firebase Function, or similar) that holds the key server-side and applies its own rate limiting/auth check.

### 3.7 MEDIUM — Security headers only exist where they don't matter

`vite.config.ts` defines a genuinely well-thought-out CSP and security header set (`X-Frame-Options`, `Strict-Transport-Security`, `Permissions-Policy`, a real `connect-src` allow-list, etc.) — but only under `server.headers`, which is **Vite's dev server only**. It has no effect on the actual static build served by GitHub Pages (which doesn't support custom response headers at all) or in production. Separately, `electron/main.js` explicitly disables CSP in the desktop app (`const CSP = ""`, commented "disabled for Clerk compatibility"). Net effect: this app currently ships with **no CSP anywhere it actually runs**, despite having written one.

**Fix:** For the web deployment, move to a host that supports response headers (Cloudflare Pages, Netlify, a Worker in front of the static assets) if GitHub Pages must be kept, or accept the header can only be delivered via `<meta http-equiv="Content-Security-Policy">` in `index.html` (weaker, but functional on GitHub Pages). For Electron, scope a CSP that allow-lists exactly Clerk's required origins rather than disabling it outright.

### 3.8 LOW — Client-side "defense in depth" that isn't

`services/security.ts` implements PBKDF2 password hashing, AES-GCM data encryption, session tokens, rate limiting, audit logging, and full TOTP-based 2FA — entirely in the browser. Two specific issues, independent of whether this module is reachable:
- **2FA secrets are stored in `localStorage` in plaintext** (`TOTP_STORAGE_KEY`). Any XSS, malicious browser extension, or shared-device access can read the raw TOTP seed and generate valid codes indefinitely — this defeats the purpose of 2FA as a second, independent factor.
- The AES-GCM "encryption" key for sensitive `localStorage` values is itself stored in `sessionStorage` as an exportable JWK in the non-Electron path — meaning anything with script execution in the page can decrypt everything this module encrypts. It's obfuscation, not encryption, for the web build.
- In the Electron desktop build specifically, the intended fix for this (`window.electronAPI.secure.encrypt/decrypt`, backed by Electron's OS-level `safeStorage`) is wired up in the preload script but **the corresponding `ipcMain.handle('secure-encrypt'/'secure-decrypt', …)` registration in `electron/main.js` doesn't exist**. Any code path that hits this in the desktop app will throw ("no handler registered"), so the one legitimately secure storage mechanism available to this app is currently non-functional.
- This module is confirmed reachable today via Settings → Security Settings → 2FA setup/verify, so it isn't purely dead code.

### 3.9 Positive findings (worth preserving)

- No use of `dangerouslySetInnerHTML`, `eval`, or `new Function` anywhere in the codebase — React's default JSX escaping is relied on correctly, which meaningfully reduces XSS surface.
- GraphQL queries/mutations are all built with `gql` template literals and variables — no string-interpolated query construction was found, so there's no GraphQL-injection pattern in the app layer itself.
- Electron's `webPreferences` are configured correctly: `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`, with a proper `contextBridge`-based preload script. This is exactly the recommended baseline and is easy to get wrong; it isn't here.
- The (currently unused) `firestore.rules` file is a genuinely well-designed, default-deny, field-protected ruleset — a good reference for what the *live* Hasura permission model should look like once §3.1 is fixed.
- The abandoned local-auth module in `services/storage.ts` (PBKDF2 hashing, rate limiting, audit logging, input sanitization) is, on its own technical merits, better security engineering than what replaced it in the live path — see §9 for why that's a problem in its own right.

---

## 4. Code Quality Score

**Score: ~45 / 100 (D+ / C-)**

| Dimension | Assessment |
|---|---|
| Type safety | `tsconfig.json` has no `strict`, `noImplicitAny`, or `strictNullChecks`. 87 occurrences of `: any` / `as any` across the codebase. TypeScript is present but largely decorative. |
| Consistency | No ESLint or Prettier configuration anywhere in the repo — style and pattern consistency depends entirely on whoever (or whatever) wrote each file. |
| Dead code | A fully unused dependency (PocketBase) and its wrapper files, an unused component (`SuperAdminLogin`), an unreachable local-auth system (`storage.ts` auth), and an unused import (`SUPER_ADMIN_CONFIG` in `App.tsx`). |
| Debug artifacts | 43 `console.log` statements left in source, including ones that log super-admin-elevation decisions and full user objects to the browser console in production. |
| Component size | Several 400–750 line "god components" (`AddUserPage.tsx` 746, `EnterpriseRegistration.tsx` 744, `MainLayout.tsx` 735) mixing data-fetching, business logic, and rendering in one file. |
| Positive | Domain logic is reasonably separated into custom hooks (`useMembers`, `useTransactions`, etc.) and dedicated GraphQL query/mutation files per module — the *shape* of the data layer is sound even where its content (hardcoded secrets) is not. |

---

## 5. Performance Analysis

- **No code-splitting anywhere.** Zero uses of `React.lazy`/dynamic `import()`, and no `manualChunks`/`rollupOptions` in `vite.config.ts`. `MainLayout.tsx` alone has 55 static top-level imports (effectively every page in the app). The last committed production build (in the tracked `hkm-church-app.zip`) shows a single ~1.87 MB (uncompressed) JS bundle — everything loads up front regardless of which page a user actually visits.
- **Tailwind is loaded twice, and the live one is the slow path.** `tailwindcss`, `postcss`, and `autoprefixer` are devDependencies, but there is no `tailwind.config.*` or `postcss.config.*` anywhere in the repo — so that pipeline is never actually invoked. All real styling instead comes from `<script src="https://cdn.tailwindcss.com">` in `index.html`, which recompiles utility CSS at runtime in every visitor's browser on every load. This is explicitly called out against for production use in Tailwind's own docs, and is a real, live cost — not just leftover cruft — for what the README markets as a mobile-first app.
- **Hasura Cloud free-tier cold starts.** Recent commits show the team correctly identified and worked around Hasura's auto-pause behavior (dual HTTP-query + subscription fallback) — good defensive engineering, but it's also a signal that the production data layer is currently running on a free tier not sized for reliable, always-on production use.
- **No memoization/virtualization patterns observed** in the large list-heavy pages (Members, Transactions, Attendance records), though a shared `PaginationControls` component exists and is used in at least the finance module — pagination is present, just not consistently across all list views.

---

## 6. Scalability Review

- The entire data layer is one Hasura Cloud project on what its subdomain naming strongly suggests is the free tier — this has hard caps on concurrent connections, request rate, and will auto-pause on idle. It is not sized for multiple congregations/branches of meaningful size operating concurrently.
- **Multi-branch support is claimed** (README, `BranchesPage`/`AddBranchPage`) but because every client holds the admin secret (§3.1), there is currently no enforced tenant isolation between branches at the data layer — any branch's data is readable/writable by any client regardless of which branch a user is scoped to. Multi-tenancy cannot be considered "supported" in any meaningful security sense until §3.1 is fixed and branch-scoped Hasura permissions are defined.
- No server-side rate limiting or business-logic layer exists to protect the system as usage grows — every constraint the app currently has (password policy, permission checks, session expiry) is enforced only in client code that a user's own browser is free to skip.

---

## 7. Maintainability Score

**Score: ~40 / 100**

- A flat, 101-file `components/` directory with no domain grouping will only get harder to navigate as the app grows; there's no clear boundary between, e.g., "Finance" and "Members" beyond filename prefixes.
- Three coexisting, partially-live backend integrations (Hasura, Firebase, PocketBase) plus a fourth abandoned local one mean a new contributor has to understand four different systems before being confident they're editing the one that actually runs in production.
- No linting or formatting configuration means style drift is unchecked over time.
- Zero automated tests (§10) means every refactor — including the security fixes this report recommends — currently has no safety net beyond manual click-testing.

---

## 8. Technical Debt Analysis

| Item | Type | Cost of carrying it |
|---|---|---|
| PocketBase dependency + `pbService.ts`/`pocketbase.ts` | Dead code | Unused dependency, bundle weight, contributor confusion |
| Legacy local-auth system in `services/storage.ts`/`security.ts` (PBKDF2, sessions, rate limiting) | Unreachable dead code | ~600+ lines of unused, well-written security code nobody will maintain or trust |
| `SuperAdminLogin.tsx` + unused `SUPER_ADMIN_CONFIG` import | Dead code | Confusing artifact of a previous auth design, still ships in the bundle |
| Firebase (`firebaseService`, `firestore.rules`, Firestore Auth) | Partially-live legacy | Two sources of truth risk; rules maintained for a system barely used |
| Committed `.env` with live secrets | Critical hygiene failure | See §3.1 |
| Committed `hkm-church-app.zip` build artifact | Repo hygiene | Bloats history, risks serving/reviewing stale code |
| Leftover AI-Studio import-map + `esm.sh` CDN imports in `index.html` | Inert cruft | Currently harmless (Vite/Rollup ignores it at build time) but confusing and inconsistent with `package.json`'s actual pinned versions (e.g., README claims "React 19", `package.json` has React 18.2.0) |
| Tailwind CDN script vs. unused Tailwind/PostCSS devDependencies | Redundant/conflicting build tooling | Real runtime performance cost (§5) for no benefit |
| 87 `any`/`as any` casts, no `strict` in `tsconfig.json` | Type-safety erosion | Silent runtime errors TypeScript should have caught |
| No ESLint/Prettier | Process gap | Unenforced consistency, easy to regress |

---

## 9. Dependency Review

- **20 known vulnerabilities** in the current lockfile: 2 critical, 7 high, 11 moderate (full detail in §3.3–3.4).
- **Electron 28.0.0** is pinned against a current latest of **43.1.0** — roughly 15 major versions behind. Electron majors track specific Chromium releases, so this gap represents a very large amount of unpatched browser-engine surface shipped inside the distributed desktop installers, on top of the app-level issues above.
- **Firebase 10.8.0** vs. latest **12.16.0** — two majors behind, partly explaining the `undici`/`protobufjs` transitive CVEs.
- **`@clerk/clerk-react` 5.59.2** sits inside the disclosed CVE range; a same-major patch upgrade resolves it (§3.3).
- **No Dependabot or Renovate configuration** exists, so none of the above is being surfaced automatically — these vulnerabilities will keep accumulating silently.
- **PocketBase** (`pocketbase: ^0.21.1`) is a fully unused dependency (§9 table above) — pure removal candidate.

---

## 10. Testing Quality

**Score: 0 / 10 — no automated tests exist.**

- No test files (`*.test.*`, `*.spec.*`) anywhere in the repository.
- No test framework in `devDependencies` — no Jest, Vitest, React Testing Library, Playwright, or Cypress.
- `TESTING_INSTRUCTIONS.md` exists but describes **manual** testing steps for the desktop app, not an automated suite.
- Given the severity of the findings in §3, this matters more than usual: none of the recommended fixes (removing the admin secret, fixing the elevation logic, upgrading Clerk) currently have any automated way to verify they didn't break the app, or to prevent the same class of bug from being reintroduced later.

---

## 11. CI/CD Evaluation

**Score: 2 / 10 — builds and deploys, and nothing else.**

`.github/workflows/deploy.yml` is a single job: checkout → `npm ci` → `npm run build` (which is just `tsc && vite build`) → deploy the `dist/` folder to GitHub Pages, on every push to `main` and every PR.

Missing, relative to a production-grade pipeline:
- No test step (there are no tests to run — see §10).
- No lint/typecheck-as-a-gate step separate from the build (the build does run `tsc`, so a type error does fail the build — that's something — but there's no linting at all).
- No dependency/secret scanning (`npm audit`, Dependabot, or a tool like `gitleaks`/`trufflehog`) — which is exactly the kind of check that would have caught the committed `.env` and hardcoded admin secret before they ever reached `main`.
- No separation between "preview build" and "production deploy" — every PR triggers the same build (though only pushes to `main` appear to actually deploy, per the `on:` trigger).
- Secrets are not injected via GitHub Actions secrets at all; the build simply uses whatever `.env` is committed (§3.5).

---

## 12. Documentation Review

**Score: ~35 / 100.**

- Six separate top-level markdown files document individual features (`ENTERPRISE_REGISTRATION_SYSTEM.md`, `PERMISSION_REQUEST_SYSTEM.md`, `USER_ROLES_AND_PERMISSIONS.md`, `GOOGLE_SIGNIN_SETUP.md`, `DESKTOP_APP_GUIDE.md`, `TESTING_INSTRUCTIONS.md`) — reasonable feature-level detail, but no single architecture document ties them together, and there's no `/docs` folder.
- `README.md` contains at least one factual inconsistency with the actual codebase: it states the frontend is "React 19," while `package.json` pins React `^18.2.0` (this likely traces back to the leftover AI-Studio import map in `index.html`, which does reference React 19 via `esm.sh` — itself inert, per §8).
- README claims an MIT License, but **no `LICENSE` file exists in the repository**.
- No documented environment-variable security model — `.env.example` lists the variables but gives no guidance on which are safe to expose client-side (`VITE_*`) versus which must never leave a server (there currently is no such category enforced anywhere, which is the root cause of §3.1).
- No contribution guide, no architecture diagram, no data-model/ERD documentation for the Hasura schema.

---

## 13. Prioritized Findings

### Critical
| # | Finding | Location |
|---|---|---|
| C1 | Hasura admin secret hardcoded client-side and repeated in 14 files, bypassing all database permissions for every request | `AuthorizedApolloProvider.tsx`, `.env`, `scripts/*.js` |
| C2 | Wildcard (`*`) super-admin auto-elevation via client-controlled env value, written back to the DB using the open admin connection | `AuthContext.tsx`, `.env` |
| C3 | Live-exploitable combination of C1+C2 on a publicly deployed, CI-built GitHub Pages site | `deploy.yml`, `vite.config.ts` |
| C4 | `@clerk/shared`/`protobufjs` at versions with disclosed critical CVEs (authz/middleware bypass, RCE) | `package-lock.json` |

### High
| # | Finding | Location |
|---|---|---|
| H1 | Gemini AI API key instantiated and usable directly from the browser | `AiFeaturesPage.tsx` + 3 others |
| H2 | `@clerk/clerk-react` pinned inside a disclosed high-severity CVE range | `package.json` |
| H3 | 7 additional high-severity transitive CVEs (`undici`, `ws`, `lodash`, `minimatch`, `@grpc/grpc-js`, `js-cookie`) | `package-lock.json` |
| H4 | No CSP in effect anywhere the app actually runs in production (dev-only in Vite, disabled in Electron) | `vite.config.ts`, `electron/main.js` |
| H5 | Electron pinned 15 majors behind current (outdated bundled Chromium in shipped desktop installers) | `package.json` |
| H6 | Zero automated tests | repo-wide |

### Medium
| # | Finding | Location |
|---|---|---|
| M1 | 2FA secrets stored in plaintext `localStorage`; encryption key for other secrets stored in exportable form in `sessionStorage` | `services/security.ts` |
| M2 | Electron `safeStorage` IPC handler referenced by preload but never registered in the main process — the one real secure-storage path is non-functional | `electron/main.js`, `electron/security.cjs` |
| M3 | No CI dependency/secret scanning; committed `.env` and admin secret would have been caught by basic tooling | `.github/workflows/deploy.yml` |
| M4 | Tailwind loaded via runtime CDN JIT compiler in production while configured-but-unused PostCSS pipeline sits dormant | `index.html`, `package.json` |
| M5 | No code-splitting; ~1.87 MB single JS bundle observed in the last committed build | `vite.config.ts`, `MainLayout.tsx` |
| M6 | Three/four coexisting backend integrations (Hasura, Firebase, PocketBase, legacy local auth), most of it dead or half-wired | repo-wide |
| M7 | Committed production build artifact (`hkm-church-app.zip`) and `.env` in version control | repo root |

### Low
| # | Finding | Location |
|---|---|---|
| L1 | No ESLint/Prettier configuration | repo-wide |
| L2 | `tsconfig.json` has no `strict` mode; 87 `any`/`as any` occurrences | `tsconfig.json` |
| L3 | 43 `console.log` statements left in source, some logging auth/role decisions | multiple |
| L4 | README/package.json version mismatches (React 19 vs 18.2.0); no LICENSE file despite README claiming MIT | `README.md` |
| L5 | Leftover AI-Studio import map and `esm.sh` script tags, inert but confusing | `index.html`, `metadata.json` |
| L6 | Audit fields like `ipAddress` are hardcoded to `'Unknown'` client-side, making login-attempt logs permanently uninformative for that field | `App.tsx`, `hooks/useLoginAttempts.ts` |

---

## 14. Refactoring Roadmap

**Phase 0 — Incident response (do this today, independent of everything else):**
1. Rotate the Hasura admin secret and Clerk secret key from their dashboards.
2. Force-invalidate the current `.env` values everywhere they're used (scripts, CI, local dev).
3. Consider taking the live GitHub Pages deployment down until Phase 1 is complete.

**Phase 1 — Close the authorization hole (days):**
1. Set up Hasura JWT auth using a Clerk-issued session token with a Hasura claims template.
2. Define real per-table, per-role Hasura permissions (start from `firestore.rules` as a reference model — it already encodes the right ownership/role logic, just for the wrong backend).
3. Remove the client-side super-admin wildcard/email-list elevation logic from `AuthContext.tsx`; replace with a server-side-only promotion path.
4. Rewrite `.github/workflows/deploy.yml` to inject build-time variables from GitHub Actions secrets, and stop committing `.env` (add it to `.gitignore`, then purge it from git history with `git filter-repo` or the BFG Repo-Cleaner — a normal `git rm` commit is not sufficient, since the old blob remains in history).
5. Remove the committed `hkm-church-app.zip` from the repo and add a `dist/`/`release/`/`*.zip` rule if not already covered by `.gitignore`.

**Phase 2 — Dependency and CI hardening (1–2 weeks):**
1. Upgrade `@clerk/clerk-react`/`@clerk/shared` to patched versions; re-run `npm audit` and address remaining high/critical items.
2. Add `npm audit --audit-level=high` (or a dedicated tool) and a secret scanner (e.g., `gitleaks`) as required CI steps, blocking merge on failure.
3. Add Dependabot (or Renovate) configuration for ongoing dependency hygiene.
4. Plan a deliberate Electron major-version upgrade (28 → current), tested against the desktop packaging pipeline.

**Phase 3 — Consolidate the architecture (2–4 weeks):**
1. Pick one backend (Hasura, given it's what's actually live) and remove PocketBase entirely, and either fully remove or fully commit to Firebase — don't keep two half-wired data sources.
2. Delete the dead legacy local-auth module in `services/storage.ts`/parts of `services/security.ts`, after confirming no reachable path depends on it; keep and adapt the genuinely good parts (rate limiting concepts, audit logging shape) into the new server-side authorization layer instead of the browser.
3. Move the Gemini AI key server-side behind a small proxy function.
4. Wire up the missing `ipcMain` handlers for Electron's `safeStorage`-backed secure storage, or remove the dead preload/IPC surface if it's no longer the intended pattern.

**Phase 4 — Code health (ongoing):**
1. Introduce ESLint + Prettier with a baseline config; fix or suppress-with-justification existing violations.
2. Turn on `strict` in `tsconfig.json` incrementally (start with `noImplicitAny` in new files via a per-directory override, expand outward).
3. Introduce Vitest + React Testing Library; start with tests for the authorization logic being rewritten in Phase 1 — that code, above all else in this repo, should never regress silently again.
4. Break up the largest components (`AddUserPage.tsx`, `EnterpriseRegistration.tsx`, `MainLayout.tsx`) into smaller, domain-scoped pieces as they're touched.
5. Introduce `React.lazy`-based route-level code splitting for the ~90-page component tree.
6. Replace the Tailwind CDN script with the already-installed PostCSS pipeline (add the missing `tailwind.config.js`/`postcss.config.js` — this is likely a 15-minute fix that removes a real, currently-active runtime cost).

---

## 15. Suggested Code Changes (concrete starting points)

**a) Remove the hardcoded admin secret and switch to per-user auth headers:**
```ts
// components/AuthorizedApolloProvider.tsx
import { useAuth } from '@clerk/clerk-react';
import { setContext } from '@apollo/client/link/context';

// Call this once you have access to Clerk's getToken() from a hook higher up,
// or wire it through a token-provider function passed into this module.
const authLink = setContext(async (_, { headers }) => {
  const token = await clerkGetToken({ template: 'hasura' }); // Clerk JWT template, configured in Hasura as JWT auth
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});
// Delete the `adminSecret` constant and the `'x-hasura-admin-secret'` header entirely.
```
Corresponding Hasura-side change: switch the project's auth mode from admin-secret-only to JWT mode, and add explicit `select`/`insert`/`update`/`delete` permissions per role per table — starting from the intent already captured in `firestore.rules`.

**b) Remove client-controlled super-admin elevation:**
```ts
// components/AuthContext.tsx — delete this block entirely:
// const superAdminEnv = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';
// const superAdminEmails = ...
// const allowAllSuperAdmin = ...
// const isSuperAdminEmail = ...
// if (isSuperAdminEmail && hUser.role !== 'Super Admin') { ...elevate... }

// Replace with: role comes only from what's already stored for this user in Hasura,
// set by a trusted, server-side-authorized process — never derived from an env
// value or email match evaluated in the browser.
```

**c) `.gitignore` additions:**
```
.env
.env.local
*.zip
release/
```
(then purge `.env` and `hkm-church-app.zip` from git history, not just from the working tree)

**d) CI: add a secret-scan and audit gate before build:**
```yaml
# .github/workflows/deploy.yml — add before the "Build" step
- name: Secret scan
  uses: gitleaks/gitleaks-action@v2

- name: Dependency audit
  run: npm audit --audit-level=high
```

**e) Fix the Tailwind duplication — add the missing config instead of the CDN script:**
```js
// tailwind.config.js (new file)
export default {
  content: ['./index.html', './App.tsx', './components/**/*.{ts,tsx}'],
  theme: { extend: { /* church-green, etc. */ } },
};
```
```js
// postcss.config.js (new file)
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```
Then remove `<script src="https://cdn.tailwindcss.com"></script>` and its inline `tailwind.config` block from `index.html`, and add a standard `@tailwind base; @tailwind components; @tailwind utilities;` entry CSS file imported once in `index.tsx`.

---

## Summary

The parts of this app that are ordinary web-app engineering — the React/hooks structure, the GraphQL data layer, the Electron packaging — are built with reasonable intent and, in places (the Electron `webPreferences`, the `firestore.rules` design, the dual-fetch handling of Hasura cold starts), genuinely good instincts. The problem is that the actual security boundary of the whole system — who can read or change a church's member, financial, and attendance data — currently doesn't exist, because a full-access database credential and a client-controlled "make me an admin" switch both ship directly to every visitor's browser, on a site that's built and deployed automatically on every push. Fixing that (Phase 0–1 above) is a matter of days, not months, and should happen before anything else in this report.
