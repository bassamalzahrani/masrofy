$ErrorActionPreference = 'Stop'
$Sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$BuildTools = Join-Path $Sdk 'build-tools\34.0.0'
$PlatformJar = Join-Path $Sdk 'platforms\android-34\android.jar'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Out = Join-Path $Root 'build'
$Assets = Join-Path $Root 'assets\www'

if (Test-Path $Out) { Remove-Item -LiteralPath $Out -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Out,$Assets,(Join-Path $Out 'classes'),(Join-Path $Out 'dex') | Out-Null
$AndroidJar = Join-Path $Out 'android.jar'
Copy-Item -LiteralPath $PlatformJar -Destination $AndroidJar -Force

function Confirm-NativeResult([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}

$WebRoot = Split-Path -Parent $Root
$WebFiles = @('index.html','style.css','app.js','chart.min.js','manifest.json','icon.svg','icon-192.png','icon-512.png','sw.js')
foreach ($File in $WebFiles) { Copy-Item -LiteralPath (Join-Path $WebRoot $File) -Destination (Join-Path $Assets $File) -Force }
foreach ($Density in @('mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi')) {
  Copy-Item -LiteralPath (Join-Path $WebRoot 'icon-192.png') -Destination (Join-Path $Root "res\mipmap-$Density\ic_launcher.png") -Force
}

$Javac = Join-Path $env:JAVA_HOME 'bin\javac.exe'
if (-not (Test-Path $Javac)) { $Javac = (Get-Command javac).Source }
$JavaSources = @(Get-ChildItem -LiteralPath (Join-Path $Root 'src') -Recurse -Filter '*.java' | Select-Object -ExpandProperty FullName)
if ($JavaSources.Count -eq 0) { throw 'No Java sources found' }
& $Javac -g:none -source 8 -target 8 -encoding UTF-8 -classpath $AndroidJar -d (Join-Path $Out 'classes') $JavaSources
Confirm-NativeResult 'javac'
$Jar = Join-Path $env:JAVA_HOME 'bin\jar.exe'
if (-not (Test-Path $Jar)) { $Jar = (Get-Command jar).Source }
& $Jar cf (Join-Path $Out 'app.jar') -C (Join-Path $Out 'classes') .
Confirm-NativeResult 'jar'
& (Join-Path $BuildTools 'd8.bat') --lib $AndroidJar --min-api 24 --output (Join-Path $Out 'dex') (Join-Path $Out 'app.jar')
Confirm-NativeResult 'd8'

$Unsigned = Join-Path $Out 'masrofy-unsigned.apk'
& (Join-Path $BuildTools 'aapt.exe') package -f -M (Join-Path $Root 'AndroidManifest.xml') -S (Join-Path $Root 'res') -A (Join-Path $Root 'assets') -I $AndroidJar -F $Unsigned
Confirm-NativeResult 'aapt package'
Push-Location (Join-Path $Out 'dex')
try { & (Join-Path $BuildTools 'aapt.exe') add $Unsigned 'classes.dex' | Out-Null } finally { Pop-Location }
Confirm-NativeResult 'aapt add classes.dex'

$Aligned = Join-Path $Out 'masrofy-aligned.apk'
& (Join-Path $BuildTools 'zipalign.exe') -f 4 $Unsigned $Aligned
Confirm-NativeResult 'zipalign'
$DebugKey = Join-Path $env:USERPROFILE '.android\debug.keystore'
& (Join-Path $BuildTools 'apksigner.bat') sign --ks $DebugKey --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out (Join-Path $WebRoot 'Masrofy-v1.9-debug.apk') $Aligned
Confirm-NativeResult 'apksigner sign'
& (Join-Path $BuildTools 'apksigner.bat') verify --verbose (Join-Path $WebRoot 'Masrofy-v1.9-debug.apk')
Confirm-NativeResult 'apksigner verify'
