/**
 * Generate PWA icons for Clinix.
 * Run: npx tsx scripts/generate-icons.ts
 *
 * Creates icon-192.png and icon-512.png in public/icons/
 * using Node.js canvas-free SVG → PNG conversion.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const SIZES = [192, 512]
const OUT_DIR = join(__dirname, '..', 'public', 'icons')

function generateSVG(size: number): string {
  const fontSize = Math.round(size * 0.45)
  const borderRadius = Math.round(size * 0.22)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#bg)"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}"
    font-weight="700" fill="white" letter-spacing="-0.02em">C</text>
</svg>`
}

mkdirSync(OUT_DIR, { recursive: true })

for (const size of SIZES) {
  const svg = generateSVG(size)
  const svgPath = join(OUT_DIR, `icon-${size}.svg`)
  writeFileSync(svgPath, svg)
  console.log(`✓ Generated ${svgPath}`)
}

console.log('\nSVG icons generated. For PNG conversion, use:')
console.log('  npx sharp-cli -i public/icons/icon-192.svg -o public/icons/icon-192.png')
console.log('  npx sharp-cli -i public/icons/icon-512.svg -o public/icons/icon-512.png')
console.log('\nOr use the SVGs directly in manifest.json (change type to image/svg+xml)')
