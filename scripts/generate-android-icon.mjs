import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const source = path.resolve('public/convogram-icon.svg');
const output = path.resolve('android/app/src/main/res');
if (!fs.existsSync(source)) throw new Error(`Missing ${source}`);
fs.mkdirSync(output, { recursive: true });

const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const densityScale = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [density, scale] of Object.entries(densityScale)) {
  const dir = path.join(output, `mipmap-${density}`);
  fs.mkdirSync(dir, { recursive: true });
  const size = sizes[density];
  try {
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', path.join(dir, 'ic_launcher.png'), source]);
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', path.join(dir, 'ic_launcher_round.png'), source]);
  } catch {
    throw new Error('Unable to convert Convogram icon SVG to PNG on the Android build runner.');
  }
}
