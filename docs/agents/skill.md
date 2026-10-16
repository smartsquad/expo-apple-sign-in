# Agent skill

The repository includes an agent skill, a Markdown file that tells an AI coding agent how to add Sign in with Apple with `expo-apple-sign-in`. An agent that loads it knows the install steps, the one API, the nonce rule, and the provider adapters, so it writes code that matches the library instead of reaching for packages the library replaces. This page explains what the skill contains, how to install it, and which machine-readable copies of this documentation the site publishes.

## What the skill teaches

The skill lives at `skills/expo-apple-sign-in/SKILL.md` and follows the Agent Skills format that the `skills` CLI and skills.sh read. Its frontmatter sets `name` to `expo-apple-sign-in`, which matches the directory name. The `description` says what the skill does (Sign in with Apple on Expo SDK 58 for iOS, Android, and web, with the adapters for Supabase, Clerk, and Firebase). It then lists the situations that should load it, such as replacing `expo-apple-authentication`, setting up the Services ID, passing the nonce to Supabase or Firebase, enabling web redirect sign-in on phones, verifying the identity token on a server, and testing through a tunnel. It also excludes Expo SDK 57 and older, Expo Go, and native apps without Expo, and ends with a trigger list of terms and error codes such as `invalid_client` and `ERR_REQUEST_CANCELED`. The `license` is MIT, `compatibility` states that the skill needs a development or release build and that Android and web need a Services ID and an HTTPS redirect URI, and `metadata` carries the author, the version (which matches the package version), the website, the repository, and the npm page.

The body is an agent reference with these sections:

- Rules: Pass `credential.nonce` unchanged and never hash it again, do not add `expo-crypto`, `expo-apple-authentication`, `@invertase/react-native-apple-authentication`, or `react-apple-signin-auth`, use a development or release build instead of Expo Go, never log tokens, codes, or nonces, never ship `.p8` keys, expect `ERR_REQUEST_FAILED` from a second concurrent sign-in on iOS and Android, and call `signIn` from a press or click handler on web.
- Install: Run `npx expo install expo-apple-sign-in`, add the plugin to `expo.plugins`, remove `ios.usesAppleSignIn`, and rebuild with `npx expo prebuild --clean` and `npx expo run:ios` or `npx expo run:android`.
- Apple Developer setup: iOS needs the Sign in with Apple capability on the App ID and no Services ID. Android and web need a Services ID with the domain and the exact Return URL, over HTTPS, and web needs a Return URL on the page's own origin.
- Configure: `AppleAuth.configure({ clientId, redirectUri, scopes?, webMode? })` once at startup, what iOS ignores, what `isConfigured()` returns, a per-platform `redirectUri` snippet, and the accepted scopes.
- Sign in: `AppleAuth.signIn` and `AppleAuth.request` with their outcomes and the response helpers, the options, the credential fields, the first-authorization rule for name and email, the fields only iOS fills, and what `isAvailable`, `getCurrentCredential`, `signOut`, `generateNonce`, and `sha256Hex` do.
- Button and hook: The props of `AppleButton`, the rule that `onPress` takes over the press, why an adapter belongs in `onPress` and not in `onSuccess`, and the options and return values of `useAppleAuth`.
- Providers: The `signInWithSupabase`, `signInWithClerk`, and `signInWithFirebase` calls with the shape each one returns, the Client IDs field in Supabase, the `@clerk/expo/legacy` hooks, the Firebase JS SDK snippet, `toFirebaseAppleCredential`, the React Native Firebase variant, and the `ERR_MISSING_IDENTITY_TOKEN` error that all three adapters throw.
- Web: The popup default, `webMode: 'auto'` and `'redirect'`, the `handleAppleWebRedirect` route, the Expo Router settings that turn API routes on, how the result is replayed after the return, and the Content Security Policy entry for `https://appleid.apple.com`.
- iOS credential state: `getCredentialState` and `addRevokeListener`, and the fact that Android and web return `'unknown'` and never call the listener.
- Errors: A table of the seven error codes, with `isAppleAuthError`, `isCancelledError`, and `AppleAuthErrorCode`.
- Verify on a server: The signature, issuer, audience, expiry, and nonce checks, and the advice to use `sub` as the account key.
- Test locally: The section says that Apple rejects `localhost` and IP addresses, so web and Android sign-in goes through an HTTPS tunnel with the host and Return URL registered on the Services ID. It lists what a new tunnel host and a change to `EXPO_PUBLIC_*` values require, what web redirect mode and Android need from the server, what iOS needs, and links to the [local testing guide](/guides/local-testing).
- Troubleshooting: A symptom-to-fix list for `invalid_client`, `ERR_NOT_CONFIGURED`, a rejected Supabase nonce, the iOS Simulator, a blocked popup, Apple's error page in a phone browser, a 405 or 404 on Apple's POST, and a missing name or email.
- Docs: Links to this site, the API reference, and `llms-full.txt`.

## Install the skill

Use the `skills` CLI to add it to a project:

```bash
npx skills add smartsquad/expo-apple-sign-in
```

Add `-g` for a user-level install, or `-a claude-code` (or another agent) to target one agent. The skill's listing lives at [skills.sh/smartsquad/expo-apple-sign-in](https://skills.sh/smartsquad/expo-apple-sign-in).

To install it by hand, copy the `skills/expo-apple-sign-in/` directory from the [GitHub repository](https://github.com/smartsquad/expo-apple-sign-in) into your project as `.claude/skills/expo-apple-sign-in/` for Claude Code, or `.agents/skills/expo-apple-sign-in/` for agents that read that directory.

```bash
mkdir -p .claude/skills
cp -R path/to/expo-apple-sign-in/skills/expo-apple-sign-in .claude/skills/
```

## Documentation for agents

This site publishes the documentation in forms that a language model can read directly. The files are generated at build time by `vitepress-plugin-llms`.

| Resource | Content |
|---|---|
| `/llms.txt` | An index of the pages with their titles and links. |
| `/llms-full.txt` | The full text of every page in one file. |
| Copy as Markdown | A button on each page that copies that page as Markdown. |

Point an agent at `/llms-full.txt` when it needs the whole documentation in context, or paste a single page with the copy button when it needs one topic. The [API reference](/reference/api) is the page to give an agent when it must produce exact signatures.

## Related

Start with [Installation](/getting-started/installation) and [Quick start](/getting-started/quick-start) for the steps the skill summarizes.
