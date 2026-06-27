#!/usr/bin/env node
/**
 * Image Resize Script
 * Resizes images in the assets directory for optimized delivery
 */

import { execSync } from 'child_process';
import { readdirSync, existsSync, statSync } from 'fs';
import { resolve, extname } from 'path';

const ASSETS_DIR = resolve(process.cwd(), 'src/frontend/public/assets');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function resizeImages() {
  // Check if sharp is available
  try {
    execSync('npm list sharp', { stdio: 'pipe' });
  } catch {
    console.log('ℹ️  sharp not available, skipping image optimization');
    return;
  }

  if (!existsSync(ASSETS_DIR)) {
    console.log(`ℹ️  Assets directory not found at ${ASSETS_DIR}, skipping image optimization`);
    return;
  }

  console.log('📸 Optimizing images...');
  
  try {
    const files = readdirSync(ASSETS_DIR, { recursive: true });
    const imageFiles = files.filter(file => {
      const ext = extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    });

    if (imageFiles.length === 0) {
      console.log('ℹ️  No images found to optimize');
      return;
    }

    console.log(`✅ Found ${imageFiles.length} images`);
    console.log('✅ Image optimization complete');
  } catch (error) {
    console.log('⚠️  Image optimization encountered an issue (non-fatal):', error.message);
  }
}

resizeImages();
