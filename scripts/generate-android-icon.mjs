import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const source = path.resolve('public/convogram-icon.svg');
const output = path.resolve('android/app/src/main/res');
if (!fs.existsSync(source)) throw new Error(`Missing ${source}`);
fs.mkdirSync(output, { recursive: true });

// Remove every generated launcher/splash definition first so Capacitor's
// default adaptive icon cannot survive into the release APK.
for (const dir of ['mipmap-anydpi', 'mipmap-anydpi-v26', 'drawable', 'drawable-v21', 'drawable-v24']) {
  fs.rmSync(path.join(output, dir), { recursive: true, force: true });
}

const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(sizes)) {
  const dir = path.join(output, `mipmap-${density}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', path.join(dir, name), source]);
  }
}

// The release build uses a Convogram-only splash drawable. No Capacitor
// splash-screen artwork is copied or referenced.
const drawable = path.join(output, 'drawable');
fs.mkdirSync(drawable, { recursive: true });
execFileSync('rsvg-convert', ['-w', '512', '-h', '512', '-o', path.join(drawable, 'splash.png'), source]);
console.log('Convogram Android icon and splash assets generated.');
