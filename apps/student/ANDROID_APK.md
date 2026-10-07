# Student Android preview APK

The app uses the production backend at `https://backend.kormic.ai`. Set
`KORMIC_API_ORIGIN_PUBLIC=https://backend.kormic.ai` in the frontend root
`.env`; the APK build embeds that origin plus `/api`. Rebuild the APK after
changing the URL. The backend host must be reachable over HTTPS for sign-in and
AI features.

Face verification is controlled by the backend. After installing this APK,
enable `STUDENT_FACE_AUTH_REQUIRED=true` in the backend service environment and
configure `STUDENT_FACE_ENCRYPTION_KEY` and `FACE_MODEL_DIRECTORY` as described
in the backend's `deploy/FACE_VERIFICATION.md`. Restart the backend service so
it reads those values. Otherwise the server issues an ordinary session after
TOTP and the app has no face challenge to display. When enabled, the scan
starts with one consent tap and captures the forward/left/right poses
automatically as the backend accepts them.

For a non-Docker Supervisor deployment, install the models with the backend
virtual environment's `python manage.py install_face_models` command, point
`FACE_MODEL_DIRECTORY` at that installed model directory, and add the three
settings to the environment loaded by the Supervisor API process before
restarting it.

## Local Windows build

Install Java 17 and the Android SDK, including Android 36, build-tools 36.0.0,
NDK 27.1.12297006 and CMake 3.22.1. Set `JAVA_HOME` and `ANDROID_HOME`, or use
the workspace tools installed under `.runtime/android-tools`.

From `apps/student`:

```powershell
node scripts/build-apk.mjs
```

This runs `gradlew.bat :app:assembleRelease --no-daemon --max-workers=2
-PreactNativeArchitectures=arm64-v8a,armeabi-v7a` and copies the standalone APK to
`builds/student-app.apk`. It includes its JavaScript bundle and does not need
Expo Go or Metro. This is a release-mode preview signed with the Android
project's preview/debug certificate, not a Play Store production release.

`eas.json` also has an explicit APK-producing `preview` profile for cloud builds;
EAS authentication and signing credentials are needed to use that route.

Firebase configuration is optional for this preview. Without
`firebase/google-services.json`, remote push is unavailable; the existing
in-app notification polling remains active. No backend credentials or secrets
are included in the APK.
