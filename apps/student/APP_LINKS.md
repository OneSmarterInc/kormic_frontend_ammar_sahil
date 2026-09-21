# Student app claim links

Production links use `https://app.kormic.ai/claim?token=...`. Both Expo config
and the checked-in Android manifest register only this HTTPS host and the exact
`/claim` and `/claim/` paths. iOS uses `applinks:app.kormic.ai` in
`ios.associatedDomains`. `kormicstudent://claim?token=...` remains the explicit
custom-scheme fallback. Local hosts are not Android verified domains.

`src/utils/claimLinks.ts` validates incoming URLs for both `Linking.getInitialURL`
(cold launch) and the `Linking` URL event (already running). It preserves token
encoding, rejects unrelated hosts/paths and duplicate tokens, and retains legacy
HTTPS backend claim links. Localhost/emulator HTTP links are accepted only in
development. The existing claim screen still verifies an email OTP.

## Required release setup

Deploy the Backend repository's [APP_LINKS.md](https://github.com/OneSmarterInc/Kormic_backend_sahil_ammar/blob/fix/p1-02-production-claim-links/APP_LINKS.md)
and `deploy/app-links.nginx.conf` first. It hosts:

- `https://app.kormic.ai/.well-known/assetlinks.json`
- `https://app.kormic.ai/.well-known/apple-app-site-association`
- `https://app.kormic.ai/claim?token=...` (install/open-app fallback)

The Android SHA-256 value must match the installed release's app-signing
certificate (Play app signing for Play builds, your distribution certificate for
direct APKs). The Apple App ID prefix must match the signed iOS application's
`application-identifier`, usually `TEAMID.com.kormic.student`. These are not TOTP
codes or account credentials. Association files return 503 until real values are
configured; no example signing identities are published as production values.

The checked-in Gradle template currently signs local release builds with the
debug keystore. **Do not use that APK as the production release or add its debug
fingerprint to production assetlinks.** Configure real release signing through
EAS credentials/your release pipeline and inspect the resulting APK/AAB signer.
Since `android/` is checked in, EAS does not regenerate its native configuration;
this change updates that manifest explicitly as well as app.json. There is no
checked-in `ios/` directory: Expo prebuild generates its entitlement. If you keep
an iOS native project elsewhere, regenerate/synchronize it before release.

Enable Associated Domains for the Apple App ID, refresh provisioning, and create
new signed builds. An OTA update cannot change intent filters or entitlements.
Inspect the final Android manifest and iOS entitlements, then install from the
same distribution channel whose certificates you configured.

## Device acceptance checks (required before pilot sign-off)

1. Check both public association URLs return 200 JSON without redirect or login.
2. On Android 12+, after installing the signed build:

   ```sh
   adb shell pm verify-app-links --re-verify com.kormic.student
   adb shell pm get-app-links com.kormic.student
   adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'https://app.kormic.ai/claim?token=TEST_TOKEN'
   ```

   Wait for asynchronous verification: `app.kormic.ai` must show `verified`.
   Also test the oldest supported Android version; do not force the package in
   the intent command because that would bypass normal link resolution.
3. On a physical iPhone, install the signed build and tap the invitation link
   from Mail or Notes. Typing into Safari's address bar is not a Universal Link
   acceptance test. Check Apple's cached association if propagation is delayed.
4. On each platform, test with the app stopped and already running. Confirm the
   intended token reaches “Claim invitation” and email OTP validation still works.
5. Test `kormicstudent://claim?token=TEST_TOKEN` independently. Test expired and
   malformed invitations and confirm unrelated links do not start the claim flow.
6. Uninstall the app and tap HTTPS: installation help must appear. Install again,
   reopen the original email link, and finish claiming. No deferred-install token
   recovery is promised; the fallback explains reopening and manual token entry.
7. On desktop, verify fallback content and store links. The fallback must not
   consume a token, send an OTP, or put it into store links or analytics.

## Automated checks

```sh
npm test
npm run lint
npm run typecheck
node scripts/check-app-links.mjs
```

Native verification still requires real signing identities, public DNS/TLS and
physical devices. See [Expo iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links/)
and [Android App Link verification](https://developer.android.com/training/app-links/verify-applinks).
