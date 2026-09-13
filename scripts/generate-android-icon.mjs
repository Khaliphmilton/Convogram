import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const source = path.resolve('public/convogram-icon.svg');
const output = path.resolve('android/app/src/main/res');
if (!fs.existsSync(source)) throw new Error(`Missing ${source}`);
fs.mkdirSync(output, { recursive: true });

// Capacitor creates adaptive launcher resources when the native project is added.
// Remove them so Android cannot select the Capacitor default icon on newer Android versions.
for (const dir of ['mipmap-anydpi', 'mipmap-anydpi-v26']) {
  fs.rmSync(path.join(output, dir), { recursive: true, force: true });
}

const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(sizes)) {
  const dir = path.join(output, `mipmap-${density}`);
  fs.mkdirSync(dir, { recursive: true });
  try {
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', path.join(dir, 'ic_launcher.png'), source]);
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', path.join(dir, 'ic_launcher_round.png'), source]);
  } catch {
    throw new Error('Unable to convert Convogram icon SVG to PNG on the Android build runner.');
  }
}

// Remove Capacitor's generated splash resources. Convogram does not use the Capacitor
// SplashScreen plugin; Android will launch directly into the Convogram UI.
for (const name of ['splash.png', 'splash.xml', 'capacitor_splash_screen.xml']) {
  fs.rmSync(path.join(output, 'drawable', name), { force: true });
}
