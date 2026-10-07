# CONVENTIONS

Canonical rules for this repository. When `AGENTS.md`, nested guides, or chat disagree with this file, **this file wins**.

Inherited from:

- [smartsquad/Inksquad-platform](https://github.com/smartsquad/Inksquad-platform) `CONVENTIONS.md` and `AGENTS.md` (commits, changelog, control flow, spacing, named imports, T / I / E prefixes)
- [massimodeluisa/callingyou-ai](https://github.com/massimodeluisa/callingyou-ai) `CONVENTIONS.md` (English everywhere, CONVENTIONS over AGENTS, TypeScript house style)
- [smartsquad/clickrisorse-platform](https://github.com/smartsquad/clickrisorse-platform) `docs/CONVENTIONS.md` (same house style, root policy `UPPERCASE.md`)

Adapted for a **single Expo Modules 2.0 library** (not a Vue or Turborepo monorepo).

Related: [AGENTS.md](./AGENTS.md), [CONTRIBUTING.md](./CONTRIBUTING.md), [CHANGELOG.md](./CHANGELOG.md).

---

## C-0. English everywhere

Everything authored here is English: identifiers, comments, `// MARK` sections, docs, commits, changelog, tests, CI comments, error **codes**.

User-facing Apple button labels stay the official English HIG strings (`Sign in with Apple`, and so on).

---

## C-1. One API, three platforms

| Layer | Path | Owns |
|-------|------|------|
| JS API | `src/` | `AppleAuth`, `useAppleAuth`, `AppleButton`, nonce, errors |
| Adapters | `src/adapters/` | Thin Clerk / Supabase / Firebase wrappers over `AppleAuth.signIn` |
| Web | `src/web/` | Apple JS SDK (`usePopup: true`) |
| iOS | `ios/` | AuthenticationServices via `@ExpoModule` / `@JS` |
| Android | `android/` | Services ID WebView via `@ExpoModule` / `@JS` |
| Config plugin | `app.plugin.js` | `ios.usesAppleSignIn` plus entitlement |
| Docs | `docs/` | VitePress site, GitHub Pages (images-in-motion pattern) |
| Example | `example/` | Compact Expo SDK 58 app (expo/examples shape) with `AppleButton` |

- Target **Expo SDK 58** and **Expo Modules 2.0** only. Do not regress to the 1.0 `ModuleDefinition` DSL.
- Do not add `expo-crypto`, `expo-apple-authentication`, `@invertase/react-native-apple-authentication`, or `react-apple-signin-auth`.
- iOS uses the app App ID. Android and web need a Services ID (`clientId`) and HTTPS `redirectUri`.
- The library SHA-256-hashes the nonce for Apple and returns the **raw** nonce on the credential.
- Never log identity tokens, authorization codes, refresh tokens, or nonces.
- Never commit Apple `.p8` keys or auth-provider secrets.

---

## C-2. Git

From Inksquad-platform:

1. **Lowercase only.** The entire subject line is lowercase.
2. **Hyper-synthetic.** One ultra-short English subject.
3. **Subject only. No body, ever.** No blank line, paragraphs, bullets, footers, signed-off-by, or `Co-authored-by` trailers.
4. Form: `type: summary`. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`.
5. One logical change per commit when practical.
6. No force-push to `main`. No secrets in the tree.
7. Daily work happens on `develop`. `main` is release and GitHub Pages only. Do not commit library or docs work to `main`.

---

## C-3. Changelog

`CHANGELOG.md` follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) **except** Inksquad's three-section limit:

- `### Added`
- `### Changed`
- `### Removed`

Never use `### Fixed`, `### Deprecated`, or `### Security`. Bugfixes go under `### Changed`. Work accumulates under `## [Unreleased]`. Each allowed section appears at most once. Omit empty headings.

Every commit that changes user-visible or operational behaviour updates `[Unreleased]` in the same change.

---

## C-4. TypeScript

- **Types** `T` (`TAppleCredential`). **Interfaces** `I` (`IAppleButtonProps`). **Const enums / constant maps** `E` (`EAppleAuthErrorCode`). Prefer `as const` plus a union over `enum`.
- Public runtime names stay unprefixed (`AppleAuth`, `AppleButton`). Public type aliases without a prefix (`AppleCredential`) are allowed so the package matches Apple terminology. Canonical declarations still use T / I / E.
- No `any`. Use `unknown` and narrow.
- Always braces on `if` / `else` / `for` / `while`.
- Do not put `return`, `throw`, `break`, or `continue` on the same line as `if`.
- Blank line immediately before `return` when the same block has other statements above it. No blank line when `return` is the only statement.
- Named imports stay on one line. Never wrap `{ ... }` across lines.
- `import type` for type-only imports.
- Single quotes, no semicolons, 2-space indent. Prettier wins on files it formats.
- Exported functions that define a contract get an explicit return type.
- Large modules use `// MARK: - <Section>` (imports, types, constants, public API, helpers).

---

## C-5. Docs

- All documentation is English.
- Docs are VitePress in `docs/`, same pattern as [images-in-motion](https://iim.smartsquad.io/). Local: `npm run docs:dev` at `http://127.0.0.1:43173/`. Publish: `.github/workflows/pages.yml` to GitHub Pages at `https://smartsquad.github.io/expo-apple-sign-in/`.
- Root policy files are `UPPERCASE.md` (`CONVENTIONS.md`, `AGENTS.md`, `CHANGELOG.md`, `README.md`).
- No em dash (U+2014). Use commas, colons, or periods.
- No filler: "seamless", "robust", "leverage".
- Code samples must be runnable as written.

---

## C-6. Validation

```bash
npm test
npm run typecheck
npm run build
npm run docs:build
```

Do not claim "works" without running the relevant check.
