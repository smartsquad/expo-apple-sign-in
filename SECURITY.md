# Security policy

## Supported versions

Only the 1.x line receives security fixes.

| Version | Status                   |
|---------|--------------------------|
| `1.x`   | Supported on Expo SDK 58 |

## Reporting a vulnerability

To report a vulnerability, email [massimodeluisa@me.com](mailto:massimodeluisa@me.com). Do not open a public issue or discussion. The maintainers reply by email.

Include these details:

- State the affected platform: iOS, Android, or web.
- Give the `expo-apple-sign-in` version.
- List the steps that reproduce the problem.
- Describe the impact you observed or expect.

Never include identity tokens, authorization codes, nonces, or Apple keys in a report.

## Scope

This policy covers the library's JavaScript, Swift, and Kotlin code and its Expo config plugin. Apple's services and the authentication providers you connect, such as Clerk, Supabase, and Firebase, are out of scope. Report problems in those to Apple or to the provider.
