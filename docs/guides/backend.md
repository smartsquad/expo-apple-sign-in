# Backend verification

The identity token that `AppleAuth.signIn` returns is a JWT signed by Apple, and the app only holds it. Anyone can send your server a string that looks like a token, so the server must verify the signature and the claims before it trusts the person it names. This page lists the checks, shows a Node and TypeScript implementation with `jose`, and covers the authorization code exchange, private relay emails, and token revocation for account deletion. If you use Supabase, Clerk, or Firebase, the provider performs these checks for you and you can skip the verification sample.

::: info Apple facts on this page
The values below (key set URL, issuer, token endpoint) come from Apple's Sign in with Apple documentation. Confirm them against Apple's current documentation before you ship.
:::

## What to verify

Verify these properties of the identity token on every sign-in.

1. Signature: Fetch Apple's public keys from the JWKS endpoint `https://appleid.apple.com/auth/keys` and verify the token with the key whose `kid` matches the token header. Apple signs with RS256.
2. Issuer: The `iss` claim must equal `https://appleid.apple.com`.
3. Audience: The `aud` claim must be your own identifier: the bundle ID for tokens created on iOS, and the Services ID for tokens created on Android and web. A server that accepts several platforms accepts a list of audiences.
4. Expiry: The `exp` claim must be in the future.
5. Nonce: The `nonce` claim must equal the SHA-256 hex digest of the raw nonce that `AppleAuth.signIn` returned on `credential.nonce`. This ties the token to the sign-in attempt that your app started.

The library hashes the nonce before Apple sees it, so the token contains the digest and the app holds the raw value. Send both `identityToken` and `nonce` to your server, and compute the digest there.

## Verify the token

The sample verifies a token with `jose` and the hash function from `node:crypto`. Install the dependency with `npm install jose`.

```ts [verify-apple-token.ts]
import { createHash } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const EApple = {
  issuer: 'https://appleid.apple.com',
  keysUrl: 'https://appleid.apple.com/auth/keys',
} as const

const appleKeys = createRemoteJWKSet(new URL(EApple.keysUrl))

export type TAppleIdentity = {
  appleUserId: string
  email: string | null
  emailVerified: boolean
  isPrivateEmail: boolean
  realUserStatus: number | null
}

function isTrue(value: unknown): boolean {
  return value === true || value === 'true'
}

export function hashNonce(rawNonce: string): string {
  return createHash('sha256').update(rawNonce).digest('hex')
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  rawNonce: string,
  audiences: string[]
): Promise<TAppleIdentity> {
  const { payload } = await jwtVerify(identityToken, appleKeys, {
    issuer: EApple.issuer,
    audience: audiences,
    algorithms: ['RS256'],
  })

  if (payload.nonce !== hashNonce(rawNonce)) {
    throw new Error('The nonce does not match this sign-in attempt.')
  }

  if (!payload.sub) {
    throw new Error('The identity token has no subject.')
  }

  return {
    appleUserId: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: isTrue(payload.email_verified),
    isPrivateEmail: isTrue(payload.is_private_email),
    realUserStatus: typeof payload.real_user_status === 'number' ? payload.real_user_status : null,
  }
}
```

`jwtVerify` checks the signature, the issuer, the audience, and `exp` in one call and throws when any of them fail. `createRemoteJWKSet` fetches the keys on demand and caches them, so one module-level instance serves every request. Use `payload.sub` as the stable key of the account. The email can change or be hidden, but `sub` stays the same for the same person and the same team.

A request handler then reads the two values the app sends:

```ts [sign-in-handler.ts]
import { verifyAppleIdentityToken } from './verify-apple-token'

type TSignInBody = {
  identityToken: string
  nonce: string
}

export async function handleAppleSignIn(body: TSignInBody): Promise<string> {
  const identity = await verifyAppleIdentityToken(body.identityToken, body.nonce, [
    'com.example.app',
    'com.example.app.web',
  ])

  return identity.appleUserId
}
```

Never write the token, the authorization code, or the nonce to logs.

## Exchange the authorization code

`credential.authorizationCode` is a single-use code that expires after five minutes. A server can exchange it at `https://appleid.apple.com/auth/token` for Apple's own tokens, including a refresh token. You need the refresh token from this exchange to revoke access later, as described below.

The exchange requires a client secret. Apple defines the client secret as a JWT that you sign yourself with the private key (`.p8` file) of your Sign in with Apple key:

- Algorithm `ES256`, with the Key ID in the header as `kid`.
- `iss` is your Team ID, and `sub` is your client ID.
- `aud` is `https://appleid.apple.com`.
- `exp` is at most six months after `iat`.

The client ID is the same identifier that appears as the audience of the identity token: the bundle ID for tokens created on iOS, the Services ID for Android and web. Create the secret on a server only. The private key never belongs in the app, in a repository, or in a sample.

```ts [apple-client-secret.ts]
import { importPKCS8, SignJWT } from 'jose'

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing environment variable ${name}`)
  }

  return value
}

export async function createAppleClientSecret(clientId: string): Promise<string> {
  const privateKey = await importPKCS8(requireEnv('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n'), 'ES256')

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: requireEnv('APPLE_KEY_ID') })
    .setIssuer(requireEnv('APPLE_TEAM_ID'))
    .setSubject(clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)
}
```

The sample reads the contents of the `.p8` file, including the `BEGIN` and `END` lines, from `APPLE_PRIVATE_KEY`, and turns escaped `\n` sequences back into line breaks, which is how many hosting dashboards store multi-line values. A short lifetime is enough because the secret is created again for each exchange.

```ts [exchange-apple-code.ts]
import { createAppleClientSecret } from './apple-client-secret'

type TAppleTokenResponse = {
  refresh_token: string
  id_token: string
}

export async function exchangeAppleCode(code: string, clientId: string): Promise<TAppleTokenResponse> {
  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: await createAppleClientSecret(clientId),
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new Error(`Apple rejected the authorization code (status ${response.status}).`)
  }

  return (await response.json()) as TAppleTokenResponse
}
```

Store the returned refresh token with the account, encrypted, because you need it to revoke access.

## Private relay emails and real user status

People can hide their real address. The `email` claim then holds a private relay address (it ends in `@privaterelay.appleid.com`) that Apple forwards to the real inbox, and you should store it like any other email. The claims `is_private_email` and `email_verified` tell you which case you are in, and the sample above exposes both.

`real_user_status` reports Apple's confidence that the account belongs to a real person: `0` means unsupported, `1` means unknown, and `2` means likely real. Use it as a signal, for example to apply extra checks to accounts with status `1`. The same signal reaches the app as `credential.realUserStatus`, which the library names `'unsupported'`, `'unknown'`, or `'likelyReal'`.

## Delete accounts and revoke tokens

Apps that let people create an account must let them delete it from inside the app (App Store Review Guideline 5.1.1(v)). When an account that signed in with Apple is deleted, Apple asks apps to revoke the tokens at `https://appleid.apple.com/auth/revoke`. The call uses the same client secret as the code exchange.

```ts [revoke-apple-token.ts]
import { createAppleClientSecret } from './apple-client-secret'

export async function revokeAppleRefreshToken(refreshToken: string, clientId: string): Promise<void> {
  const response = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: await createAppleClientSecret(clientId),
      token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Apple refused to revoke the token (status ${response.status}).`)
  }
}
```

Call it in the same flow that deletes the account record, with the refresh token you stored after the code exchange.

## Related

[Usage](/guides/usage) shows how the app obtains the credential, and [Errors](/guides/errors) lists the codes the library can return. [Apple Developer](/setup/apple-developer) explains how to create the Services ID, the key, and the Key ID used above.
