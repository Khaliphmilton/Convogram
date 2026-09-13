import fs from 'node:fs';
import path from 'node:path';

const res = path.resolve('android/app/src/main/res');
if (!fs.existsSync(res)) throw new Error('Android resources are missing.');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

for (const file of walk(res)) {
  const name = path.basename(file).toLowerCase();
  if (name.includes('capacitor') || name.includes('splash_screen')) fs.rmSync(file, { force: true });
}

for (const dirName of ['mipmap-anydpi', 'mipmap-anydpi-v26']) {
  fs.rmSync(path.join(res, dirName), { recursive: true, force: true });
}

for (const file of walk(res)) {
  if (!file.endsWith('.xml')) continue;
  let text = fs.readFileSync(file, 'utf8');
  const original = text;
  text = text
    .replace(/@drawable\/capacitor_splash_screen/g, '@drawable/splash')
    .replace(/@drawable\/splash_screen/g, '@drawable/splash')
    .replace(/@mipmap\/ic_launcher_foreground/g, '@mipmap/ic_launcher')
    .replace(/@mipmap\/ic_launcher_background/g, '@mipmap/ic_launcher');
  if (text !== original) fs.writeFileSync(file, text);
}

if (!fs.existsSync(path.join(res, 'drawable', 'splash.png'))) throw new Error('Convogram splash artwork was not generated.');
for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    if (!fs.existsSync(path.join(res, `mipmap-${density}`, name))) throw new Error(`Missing Convogram launcher icon: ${density}/${name}`);
  }
}
console.log('Android branding finalized: Convogram icon/splash only.');
