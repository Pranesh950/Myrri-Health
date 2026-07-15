# Rebuilding the Android dev client after Health Connect fixes

The crash below happens because the old `health-app.apk` was built before the `HealthConnectPermissionDelegate` was registered in `MainActivity.kt`.

```
kotlin.UninitializedPropertyAccessException: lateinit property requestPermission has not been initialized
  dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate.launchPermissionsDialog(...)
```

`npx expo start --tunnel` only starts the JavaScript bundler — it does **not** rebuild the native Android app. Because this crash is in native Kotlin code, you must build and install a new native APK.

## Prerequisites

- You are in a GitHub Codespace (or another Linux environment).
- You have the EAS CLI configured (`npm install -g eas-cli` if not already).

## One-shot command block

Copy and paste the whole block below. `eas build` is long-running; after it finishes, install the new APK on your phone, then run the final command.

```bash
# 1. Clean and regenerate the native project
#    (applies the updated config plugin to MainActivity.kt)
npx expo prebuild --clean

# 2. Build a new development client APK via EAS
#    (wait for this to finish and download the APK before continuing)
eas build --profile development --platform android

# 3. Remove the old APK so you don't accidentally open it
rm -f health-app.apk

# 4. Start the dev server
#    (only run this after you have installed the new APK on your device)
npx expo start --tunnel
```

## Manual steps after the build finishes

1. Download the new APK from the EAS build page.
2. Install it on your Android device (you may need to allow installs from unknown sources).
3. Open the **new** dev client and scan the QR code from the terminal.

**Do not use the old `health-app.apk` file in the repo.**

## Why this is required

The old APK's `MainActivity.kt` does not contain:

```kotlin
HealthConnectPermissionDelegate.setPermissionDelegate(this)
```

Every call to `requestPermission()` then tries to use an uninitialized `lateinit` property and crashes. Only a fresh native build can include the fixed `MainActivity`.

