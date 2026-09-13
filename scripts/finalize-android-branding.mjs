import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const res = path.resolve('android/app/src/main/res');
const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
const gradlePath = path.resolve('android/app/build.gradle');
const iconSvgPath = path.resolve('assets/icon.svg');

if (!fs.existsSync(res)) throw new Error('Android resources are missing.');
if (!fs.existsSync(manifestPath)) throw new Error('AndroidManifest.xml is missing.');
if (!fs.existsSync(gradlePath)) throw new Error('android/app/build.gradle is missing.');
if (!fs.existsSync(iconSvgPath)) throw new Error('Convogram icon SVG is missing.');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Remove every Capacitor-generated branding/splash asset.
for (const file of walk(res)) {
  const name = path.basename(file).toLowerCase();
  if (name.includes('capacitor') || name.includes('splash_screen') || name === 'capacitor_splash_screen.xml') {
    fs.rmSync(file, { force: true });
  }
}
for (const dirName of ['mipmap-anydpi', 'mipmap-anydpi-v26']) {
  fs.rmSync(path.join(res, dirName), { recursive: true, force: true });
}

// Keep the launcher icon generated from Convogram's SVG.
for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    if (!fs.existsSync(path.join(res, `mipmap-${density}`, name))) {
      throw new Error(`Missing Convogram launcher icon: ${density}/${name}`);
    }
  }
}

// Build a branded splash image from the same Convogram logo used by the app.
// It contains the logo, app name, tagline, and Khaliph Industries branding.
const drawableNodpi = path.join(res, 'drawable-nodpi');
const splashSvg = path.resolve('convogram-splash.svg');
const splashPng = path.join(drawableNodpi, 'convogram_splash.png');
fs.mkdirSync(drawableNodpi, { recursive: true });
const iconSvg = fs.readFileSync(iconSvgPath, 'utf8');
const iconData = Buffer.from(iconSvg, 'utf8').toString('base64');
fs.writeFileSync(splashSvg, `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="210" fill="#071426"/>
  <image x="172" y="72" width="680" height="680" preserveAspectRatio="xMidYMid meet" href="data:image/svg+xml;base64,${iconData}"/>
  <text x="512" y="820" text-anchor="middle" font-family="sans-serif" font-size="74" font-weight="700" letter-spacing="2" fill="#ffffff">CONVOGRAM</text>
  <text x="512" y="875" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="600" letter-spacing="5" fill="#b9c9e8">EVERYTHING SOCIAL, TOGETHER.</text>
  <text x="512" y="938" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" letter-spacing="6" fill="#7890b8">KHALIPH INDUSTRIES</text>
</svg>
`);
try {
  execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', '-o', splashPng, splashSvg], { stdio: 'inherit' });
} catch (error) {
  throw new Error(`Could not generate Convogram splash image: ${error?.message || error}`);
} finally {
  fs.rmSync(splashSvg, { force: true });
}
if (!fs.existsSync(splashPng)) throw new Error('Convogram splash image was not generated.');

// Android 12+ always provides a system launch window. Use the branded image
// as the launch icon and keep the background Convogram blue so the Capacitor
// logo cannot appear.
const drawable = path.join(res, 'drawable');
const values = path.join(res, 'values');
const valuesV31 = path.join(res, 'values-v31');
fs.mkdirSync(drawable, { recursive: true });
fs.mkdirSync(values, { recursive: true });
fs.mkdirSync(valuesV31, { recursive: true });

fs.writeFileSync(path.join(drawable, 'convogram_launch_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape>
            <solid android:color="#071426" />
        </shape>
    </item>
    <item android:gravity="center">
        <bitmap android:src="@drawable/convogram_splash" android:gravity="center" />
    </item>
</layer-list>
`);

const baseStyle = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="ConvogramLaunchTheme" parent="@android:style/Theme.Material.Light.NoActionBar">
        <item name="android:fontFamily">sans</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionModeOverlay">true</item>
        <item name="android:windowBackground">@drawable/convogram_launch_background</item>
        <item name="android:statusBarColor">#071426</item>
        <item name="android:navigationBarColor">#071426</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
`;

const v31Style = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="ConvogramLaunchTheme" parent="@android:style/Theme.Material.Light.NoActionBar">
        <item name="android:fontFamily">sans</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionModeOverlay">true</item>
        <item name="android:windowBackground">@drawable/convogram_launch_background</item>
        <item name="android:windowSplashScreenBackground">#071426</item>
        <item name="android:windowSplashScreenAnimatedIcon">@drawable/convogram_splash</item>
        <item name="android:statusBarColor">#071426</item>
        <item name="android:navigationBarColor">#071426</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
`;

fs.writeFileSync(path.join(values, 'convogram_launch.xml'), baseStyle);
fs.writeFileSync(path.join(valuesV31, 'convogram_launch.xml'), v31Style);

// Force the generated Activity to use the explicit Convogram launch theme.
let manifest = fs.readFileSync(manifestPath, 'utf8');
manifest = manifest.replace(/android:theme="@style\/[^"]+"/g, 'android:theme="@style/ConvogramLaunchTheme"');
if (!manifest.includes('android:theme="@style/ConvogramLaunchTheme"')) {
  manifest = manifest.replace('<application', '<application android:theme="@style/ConvogramLaunchTheme"');
}
fs.writeFileSync(manifestPath, manifest);

// Give every release a strictly increasing versionCode so the newest APK is
// installed as an update instead of being mistaken for an older build.
const versionCode = Number(process.env.ANDROID_VERSION_CODE || '1');
const versionName = process.env.ANDROID_VERSION_NAME || `1.0.${versionCode}`;
if (!Number.isInteger(versionCode) || versionCode < 1) throw new Error('Invalid Android version code.');

let gradle = fs.readFileSync(gradlePath, 'utf8');
if (/versionCode\s+\d+/.test(gradle)) gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
else gradle = gradle.replace(/android\s*\{/, `android {\n    defaultConfig {\n        versionCode ${versionCode}\n        versionName "${versionName}"\n    }`);
if (/versionName\s+"[^"]*"/.test(gradle)) gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
fs.writeFileSync(gradlePath, gradle);

if (manifest.match(/capacitor_splash|splash_screen/i)) {
  throw new Error('Capacitor splash references remain in AndroidManifest.xml');
}
console.log(`Android branding finalized: Convogram branded splash, Convogram launcher, no Capacitor splash, version ${versionName} (${versionCode}).`);
