param([string]$Apk = (Join-Path $PSScriptRoot '..\builds\student-app.apk'))
$ErrorActionPreference = 'Stop'
$app = Split-Path $PSScriptRoot -Parent
$tools = [IO.Path]::GetFullPath((Join-Path $app '..\..\..\.runtime\android-tools'))
if (!$env:JAVA_HOME) { $env:JAVA_HOME = (Get-ChildItem "$tools\java" -Directory | Select-Object -First 1).FullName }
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$tools\sdk" }
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$apkPath = (Resolve-Path -LiteralPath $Apk).Path
& "$sdk\build-tools\36.0.0\apksigner.bat" verify --verbose --print-certs $apkPath
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
$manifest = & "$sdk\build-tools\36.0.0\aapt.exe" dump badging $apkPath
if ($LASTEXITCODE -ne 0 -or ($manifest -join "`n") -notmatch "package: name='com\.kormic\.student'") { throw 'Invalid Student Android package' }
$manifest | Select-String 'package:|sdkVersion|targetSdkVersion|launchable-activity|native-code'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($apkPath)
try {
    if (!$zip.GetEntry('AndroidManifest.xml') -or !$zip.GetEntry('classes.dex') -or !$zip.GetEntry('assets/index.android.bundle')) {
        throw 'APK is missing the manifest, native code or standalone JavaScript bundle'
    }
} finally { $zip.Dispose() }
Get-Item -LiteralPath $apkPath | Select-Object FullName,Length
Get-FileHash -LiteralPath $apkPath -Algorithm SHA256
