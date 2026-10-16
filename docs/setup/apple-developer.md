# Apple Developer

Before any platform can ask Apple for an identity token, your Apple Developer account needs the matching identifiers. iOS needs an App ID with Sign in with Apple enabled. Android and web need a Services ID with a registered domain and Return URL. A server that exchanges authorization codes or revokes tokens, and some auth providers, also need a Sign in with Apple key. You create all of them in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).

The examples use placeholder values: the bundle identifier `com.example.app`, the Services ID `com.example.app.web`, the web host `app.example.com` and the Team ID `ABCDE12345`. Replace them with your own.

## Enable Sign in with Apple on the App ID

The iOS app signs in with its own App ID, so that App ID must have the Sign in with Apple capability.

1. In Certificates, Identifiers & Profiles, open **Identifiers**.
2. Select the App ID whose bundle identifier matches `ios.bundleIdentifier` in your Expo config, for example `com.example.app`. If it does not exist yet, create it with the add button and choose **App IDs**.
3. Under **Capabilities**, check **Sign in with Apple** and save.

Every App ID that signs in with Apple needs this setting, including variants such as `com.example.app.dev` if you ship separate development builds.

## Create a Services ID for Android and web

Android and web use Apple's web flow, which identifies the app by a Services ID instead of an App ID. The Services ID becomes `clientId` in `AppleAuth.configure`, and it is also the audience of the identity tokens that Android and web receive.

1. In **Identifiers**, click the add button, choose **Services IDs** and continue.
2. Enter a description and an identifier such as `com.example.app.web`, then register it.
3. Open the new Services ID, check **Sign in with Apple** and click **Configure**.
4. Set **Primary App ID** to the App ID from the previous section.
5. Under **Domains and Subdomains**, enter the host that serves your Return URL, without a scheme or path, for example `app.example.com`.
6. Under **Return URLs**, enter the full HTTPS URL that you will pass as `redirectUri`, for example `https://app.example.com/auth/callback`.
7. Confirm the dialog, then save the Services ID.

The Return URL must match `redirectUri` exactly. A Services ID can hold several Return URLs, so Android and web can use different ones. On web, the Return URL must also have the same origin as the page that starts sign-in; [Web](/setup/web) explains the rule. For web redirect mode (`webMode: 'redirect'` or `'auto'`), the Return URL is the route that answers Apple's POST, for example `https://app.example.com/auth/callback`, so that path must exist on your server. See [Answer Apple's POST](/setup/web#answer-apple-s-post).

::: warning No localhost
Apple does not accept `localhost` or IP addresses as Services ID domains or Return URLs. To test Android or web sign-in during development, register the host of an HTTPS tunnel or of a deployed preview.
:::

## Create a key when a server needs one

The app never needs a key: iOS, Android and web all receive an identity token without one, and Supabase's token sign-in needs no Apple secret either. You need a Sign in with Apple key, a `.p8` file, only when one of these applies:

- Your server exchanges the authorization code at Apple's token endpoint. The client secret for that call is a JWT signed with the key.
- Your server revokes a user's tokens, for example when the user deletes their account.
- Your auth provider asks for a private key, as Firebase does for Android and web and Clerk does for production instances.

To create the key:

1. In Certificates, Identifiers & Profiles, open **Keys** and click the add button.
2. Enter a key name, check **Sign in with Apple** and click **Configure**.
3. Choose your primary App ID, save, then continue and register the key.
4. Download the `.p8` file.

Apple lets you download the key file only once. Store it in your server's secret storage or paste it into your provider's dashboard, and never put it in the app or commit it to the repository. The [Backend verification](/guides/backend) guide shows how a server uses it.

## Find the Team ID and Key ID

Servers and providers that use the key also ask for two identifiers:

| Value | Where to find it |
| --- | --- |
| Team ID | On the **Membership details** page of your Apple Developer account. It is also the App ID Prefix shown on each App ID, for example `ABCDE12345`. |
| Key ID | On the key's page under **Keys**. The downloaded file is named `AuthKey_<Key ID>.p8`. |

With the identifiers in place, continue with the setup page for each platform you ship: [iOS](/setup/ios), [Android](/setup/android) and [Web](/setup/web).
