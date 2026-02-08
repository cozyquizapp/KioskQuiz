#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const AVATAR_DIR = path.join(__dirname, 'frontend', 'public', 'avatars');

async function getFFmpegPath() {
  try {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    return ffmpegPath;
  } catch (e) {
    console.error('FFmpeg not found. Please install: npm install -g @ffmpeg-installer/ffmpeg');
    process.exit(1);
  }
}

async function optimizeAvatar(ffmpegPath, avatarFile) {
  const inputPath = path.join(AVATAR_DIR, avatarFile);
  const outputPath = path.join(AVATAR_DIR, `${path.parse(avatarFile).name}_optimized.mp4`);
  
  console.log(`\n🎬 Optimizing: ${avatarFile}`);
  
  const stats = fs.statSync(inputPath);
  const originalSize = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   Original size: ${originalSize} MB`);
  
  try {
    // Optimize with better compression
    // -crf 23: quality (lower = better, 0-51, default 23)
    // -b:v: target bitrate
    // -preset medium: speed/quality tradeoff
    const command = `"${ffmpegPath}" -i "${inputPath}" -c:v libx264 -preset slow -crf 24 -b:v 1200k -c:a aac -b:a 96k -movflags +faststart "${outputPath}" -y`;
    
    await execPromise(command);
    
    const optimizedStats = fs.statSync(outputPath);
    const optimizedSize = (optimizedStats.size / 1024 / 1024).toFixed(2);
    const reduction = (((stats.size - optimizedStats.size) / stats.size) * 100).toFixed(1);
    
    console.log(`   Optimized size: ${optimizedSize} MB`);
    console.log(`   Reduction: ${reduction}% ✓`);
    
    // Replace original with optimized
    fs.unlinkSync(inputPath);
    fs.renameSync(outputPath, inputPath);
    
    console.log(`   Saved as: ${avatarFile}`);
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Avatar Optimization Tool');
  console.log('============================\n');
  
  const ffmpegPath = await getFFmpegPath();
  console.log(`Using FFmpeg: ${ffmpegPath}\n`);
  
  const files = fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.mp4'));
  
  console.log(`Found ${files.length} avatar(s)\n`);
  
  for (const file of files) {
    await optimizeAvatar(ffmpegPath, file);
  }
  
  console.log('\n✅ All avatars optimized!');
  
  // Show final sizes
  console.log('\n📊 Final Sizes:');
  const finalFiles = fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.mp4'));
  finalFiles.forEach(f => {
    const stats = fs.statSync(path.join(AVATAR_DIR, f));
    const size = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ${f}: ${size} MB`);
  });
}

main().catch(console.error);
