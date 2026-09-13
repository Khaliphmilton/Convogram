import fs from 'node:fs';
import path from 'node:path';

const res = path.resolve('android/app/src/main/res');
const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
const gradlePath = path.resolve('android/app/build.gradle');

if (!fs.existsSync(res)) throw new Error('Android resources are missing.');
if (!fs.existsSync(manifestPath)) throw new Error('AndroidManifest.xml is missing.');
if (!fs.existsSync(gradlePath)) throw new Error('android/app/build.gradle is missing.');

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
  if (
    name.includes('capacitor') ||
    name.includes('splash_screen') ||
    name === 'capacitor_splash_screen.xml'
  ) {
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

// Android 12+ always provides a system launch window. Make it a plain Convogram
// background with a transparent icon so the Capacitor logo can never appear.
const drawable = path.join(res, 'drawable');
const values = path.join(res, 'values');
const valuesV31 = path.join(res, 'values-v31');
fs.mkdirSync(drawable, { recursive: true });
fs.mkdirSync(values, { recursive: true });
fs.mkdirSync(valuesV31, { recursive: true });

fs.writeFileSync(path.join(drawable, 'transparent.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="@android:color/transparent" />
</shape>
`);

fs.writeFileSync(path.join(drawable, 'convogram_launch_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="#071426" />
</shape>
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
        <item name="android:windowSplashScreenAnimatedIcon">@drawable/transparent</item>
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
manifest = manifest.replace(/android:theme="@style/[^"]+"/g, 'android:theme="@style/ConvogramLaunchTheme"');
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
console.log(`Android branding finalized: Convogram launcher, no Capacitor splash, version ${versionName} (${versionCode}).`);
