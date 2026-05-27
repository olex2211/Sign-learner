# Android Local ML Build

This app supports three gesture prediction modes:

- `EXPO_PUBLIC_ML_MODE=auto`: try native on-device ML first, then fall back to the backend.
- `EXPO_PUBLIC_ML_MODE=local`: native on-device ML only.
- `EXPO_PUBLIC_ML_MODE=server`: backend `/api/ml/predict` only.

Expo Go cannot load the native ML module. Use a custom dev build or APK.

## Custom Development Build

```powershell
npm run build:android:dev
```

After installing the build on the phone:

```powershell
npm run start:lan
```

## Standalone APK

```powershell
npm run build:android:apk
```

## Local Android Build

Local Gradle builds require Android Studio/Android SDK. If Gradle reports that
the SDK location is missing, install Android Studio or create
`android/local.properties`:

```properties
sdk.dir=C:\\Users\\Oleksandr\\AppData\\Local\\Android\\Sdk
```
