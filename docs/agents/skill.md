# Agent skill

The repository includes an agent skill, a Markdown file that tells an AI coding agent how to add Sign in with Apple with `expo-apple-sign-in`. An agent that loads it knows the install steps, the one API, the nonce rule, and the provider adapters, so it writes code that matches the library instead of reaching for packages the library replaces. This page explains what the skill contains, how to install it, and which machine-readable copies of this documentation the site publishes.

## What the skill teaches

The skill lives at `skills/expo-apple-sign-in/SKILL.md`. Its frontmatter names it `expo-apple-sign-in` and tells an agent to use it when adding Apple auth, replacing `expo-apple-authentication`, or wiring Clerk, Supabase, or Firebase. The body has these sections:

- Install: Run `npx expo install expo-apple-sign-in`, add `"expo-apple-sign-in"` to `expo.plugins`, and rebuild with `npx expo prebuild` and `npx expo run:ios` or `npx expo run:android`. The skill states that the library needs Expo SDK 58 (beta) and that Expo Go cannot load it.
- API: The section shows the imports (`AppleAuth`, `AppleButton`, `useAppleAuth`, and the adapters) and the `AppleAuth.configure` call for Android and web. Its first rules say that iOS uses the native `AuthenticationServices` framework and needs no Services ID, that Android and web need a Services ID and an HTTPS redirect URI, and that the library hashes the nonce and returns the raw one. Further rules explain how a cancel surfaces from `signIn` and from `request`, what `isAvailable`, `toFirebaseAppleCredential`, `getCredentialState`, and `addRevokeListener` return, and that only iOS calls the revoke listener. The last rules cover the limit of one sign-in at a time on iOS and Android, the click handler that the web popup needs, and the name fields that only iOS fills.
- Supabase: `signInWithSupabase(supabase)` runs `AppleAuth.signIn()` and `supabase.auth.signInWithIdToken`. The skill warns against calling it from the `onSuccess` of `AppleButton`.
- Clerk: `signInWithClerk({ signIn, signUp, setActive })` uses the `oauth_token_apple` strategy.
- Custom UI: The section recommends `useAppleAuth()` for any interface, lists the values the hook returns, and notes that the hook clears `credential` when Apple revokes it on iOS. It names `AppleButton` for the black or white button, `onPress` to take over the press, and `children` to replace the Apple mark and the label, and it says that other `Pressable` props, such as `testID`, pass through.

The skill also tells the agent not to add `expo-crypto` or `expo-apple-authentication` to this flow.

## Install the skill

Use the `skills` CLI to add it to a project:

```bash
npx skills add smartsquad/expo-apple-sign-in
```

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
