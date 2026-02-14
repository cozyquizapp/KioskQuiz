// Image optimization script for KioskQuiz
// Converts PNGs to WebP and optimizes SVGs

const fs = require('fs');
const path = require('path');
const imagemin = require('imagemin').default;
const imageminWebp = require('imagemin-webp').default;
const svgo = require('svgo');

const pngDirs = [
  'frontend/public/categories',
  'frontend/public/decorations'
];
const svgDirs = [
  'frontend/public/avatars'
];

async function convertPNGsToWebP() {
  for (const dir of pngDirs) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
    if (files.length === 0) continue;
    await imagemin(files.map(f => path.join(dir, f)), {
      destination: dir,
      plugins: [imageminWebp({quality: 80})]
    });
    console.log(`Converted PNGs to WebP in ${dir}`);
  }
}

async function optimizeSVGs() {
  for (const dir of svgDirs) {
    const files = fs.readdirSync(dir);
    for (const subdir of files) {
      const subdirPath = path.join(dir, subdir);
      if (fs.statSync(subdirPath).isDirectory()) {
        const svgFiles = fs.readdirSync(subdirPath).filter(f => f.endsWith('.svg'));
        for (const svgFile of svgFiles) {
          const svgPath = path.join(subdirPath, svgFile);
          const svgData = fs.readFileSync(svgPath, 'utf8');
          const result = svgo.optimize(svgData);
          fs.writeFileSync(svgPath, result.data);
        }
        console.log(`Optimized SVGs in ${subdirPath}`);
      }
    }
  }
}

async function main() {
  await convertPNGsToWebP();
  await optimizeSVGs();
  console.log('Image optimization complete.');
}

main();
