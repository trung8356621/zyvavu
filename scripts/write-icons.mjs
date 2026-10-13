import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const iconsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons')

await mkdir(iconsDir, { recursive: true })

async function icon(size, file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#0f1419"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#f4f7fb" font-family="Segoe UI, sans-serif" font-size="${Math.round(size * 0.42)}" font-weight="700">Z</text>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(path.join(iconsDir, file))
}

await icon(192, 'icon-192.png')
await icon(512, 'icon-512.png')
console.log('ICONS_OK')
