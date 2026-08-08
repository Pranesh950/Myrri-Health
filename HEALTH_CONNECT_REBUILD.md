# Rebuilding the Android dev client after Health Connect fixes

The old `health-app.apk` may still contain the previous Health Connect native configuration. This fix uses the `expo-health-connect` plugin for the permission delegate and removes the duplicate custom activity patch.

The original failure looked like this:

```
dev.matinzd.healthconnect.utils.InvalidRecordType: Record type is not valid
  dev.matinzd.healthconnect.permissions.PermissionUtils.parsePermissions(...)
```

Permission requests now use the installed bridge's short record names (for example, `Steps`, `SleepSession`, and `ExerciseSession`) and isolate optional metrics from the core connection request.

`npx expo start --tunnel` only starts the JavaScript bundler — it does **not** rebuild the native Android app. Because this crash is in native Kotlin code, you must build and install a new native APK.

## Prerequisites

- You are in a GitHub Codespace (or another Linux environment).
- You have the EAS CLI configured (`npm install -g eas-cli` if not already).

## One-shot command block

Copy and paste the whole block below. `eas build` is long-running; after it finishes, install the new APK on your phone, then run the final command.

```bash
# 1. Clean and regenerate the native project
#    (applies expo-health-connect and removes the old custom Android patch)
npx expo prebuild --clean

# 2. Build a new development client APK via EAS
#    (wait for this to finish and download the APK before continuing)
eas build --profile development --platform android

# 3. Uninstall the old app from the Android device before installing the new APK.
#    This prevents stale native permissions/configuration from being reused.
#    Then install the newly downloaded APK.

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

Health Connect is a native Android module. Updating JavaScript or starting the Expo bundler cannot change the permissions, manifest, or native activity code inside an already-installed APK. Only a fresh prebuild and native build can install the corrected configuration.

After installing the new APK, open Health Connect and confirm this app has read access for Steps, Heart Rate, Sleep, Calories, Distance, and any optional metrics you want to use. Workout history is intentionally not requested during initial setup because some older Health Connect builds reject the exercise permission. The app checks for an independently granted `ExerciseSession` permission before reading workouts; if it is unavailable, the Fitness screen continues without workout records instead of crashing.

