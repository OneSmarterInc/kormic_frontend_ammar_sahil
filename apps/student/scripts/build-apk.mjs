import { existsSync, readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { syncBranding } from './sync-branding.mjs';
import { backendOrigin } from '../../../scripts/backend-config.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const tools = resolve(app, '../../../.runtime/android-tools');
const javaRoot = resolve(tools, 'java');
const java = process.env.JAVA_HOME || resolve(javaRoot, readdirSync(javaRoot).find(name => name.startsWith('jdk-')));
const sdk = process.env.ANDROID_HOME || resolve(tools, 'sdk');
if (!existsSync(resolve(java, 'bin/java.exe')) || !existsSync(sdk)) throw new Error('Install Java 17 and Android SDK or set JAVA_HOME and ANDROID_HOME.');
const origin = backendOrigin();
if (!origin.startsWith('https://')) throw new Error('The phone needs a publicly accessible HTTPS backend.');
const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk,
  ANDROID_USER_HOME: process.env.ANDROID_USER_HOME || resolve(app, '../../../.runtime/android-user'),
  GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || resolve(app, '../../../.gradle-cache'), CI: '1', NODE_ENV: 'production',
  EXPO_PUBLIC_API_BASE_URL: origin + '/api',
  PATH: [resolve(java, 'bin'), resolve(process.execPath, '..'), process.env.PATH].join(delimiter) };
writeFileSync(resolve(app, 'android/local.properties'), `sdk.dir=${sdk.replaceAll('\\', '/')}\n`);
await syncBranding();
const result = spawnSync('cmd.exe', ['/d', '/c', 'gradlew.bat', ':app:assembleRelease', '--no-daemon', '--max-workers=2', '-Pkotlin.compiler.execution.strategy=in-process', '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a', `-PkormicCmakeStaging=${process.env.KORMIC_CMAKE_STAGING || resolve(app, '../../../.runtime/student-cxx')}`], { cwd: resolve(app, 'android'), env, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const output = resolve(app, 'builds');
mkdirSync(output, { recursive: true });
copyFileSync(resolve(app, 'android/app/build/outputs/apk/release/app-release.apk'), resolve(output, 'student-app.apk'));
writeFileSync(resolve(output, 'build-info.json'), JSON.stringify({ app: 'Kormic', variant: 'release-preview', backend: origin, builtAt: new Date().toISOString(), architectures: ['arm64-v8a', 'armeabi-v7a'] }, null, 2));
console.log(`APK: ${resolve(output, 'student-app.apk')}`);
