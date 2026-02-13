/**
 * Overwrite Android mipmap launcher icons from assets/images/logo.png.
 * Run from project root: node scripts/regenerate-android-icon.js
 * Requires: npm install -D sharp
 */
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const iconSrc = path.join(projectRoot, 'assets', 'images', 'logo.png');
const androidRes = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

const mipmapDirs = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

if (!fs.existsSync(iconSrc)) {
  console.error('Not found:', iconSrc);
  process.exit(1);
}
if (!fs.existsSync(androidRes)) {
  console.error('Android res not found. Run from solaGameCube root.');
  process.exit(1);
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Need sharp. Run: npm install -D sharp');
    process.exit(1);
  }
  const image = sharp(iconSrc);
  const meta = await image.metadata();
  console.log('Source icon:', iconSrc, meta.width + 'x' + meta.height);

  for (const { dir, size } of mipmapDirs) {
    const outDir = path.join(androidRes, dir);
    if (!fs.existsSync(outDir)) {
      console.warn('Skip (no dir):', dir);
      continue;
    }
    const resized = image.clone().resize(size, size).webp({ quality: 90 });
    const files = ['ic_launcher_foreground.webp', 'ic_launcher.webp', 'ic_launcher_round.webp'];
    for (const name of files) {
      const outFile = path.join(outDir, name);
      await resized.clone().toFile(outFile);
      console.log('Written:', outFile);
    }
  }
  console.log('Done. Rebuild APK: cd android && .\\gradlew clean assembleRelease');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
