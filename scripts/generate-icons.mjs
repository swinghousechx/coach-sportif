// Génère les icônes PNG de la PWA à partir d'un rendu vectoriel simple,
// sans dépendance externe (pixels calculés + encodage PNG via zlib).
// Design : carré near-black, anneau orange (piste), éclair vert lime.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public')
mkdirSync(OUT, { recursive: true })

// ---- Palette ----
const INK = [10, 10, 11]
const RUN = [252, 76, 2]
const GYM = [185, 255, 60]

// Polygone de l'éclair (repère 512).
const BOLT = [
  [300, 150],
  [214, 268],
  [268, 268],
  [212, 362],
  [338, 236],
  [278, 236]
]

function pointInPolygon(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// Coin arrondi : true si (x,y) dans un rect [0,W]x[0,H] à coins de rayon r.
function inRoundedRect(x, y, W, H, r) {
  if (x < 0 || y < 0 || x > W || y > H) return false
  const cx = Math.min(Math.max(x, r), W - r)
  const cy = Math.min(Math.max(y, r), H - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

// Couleur d'un point en repère 512, variante 'rounded' | 'maskable'.
function colorAt(x, y, variant) {
  let bg // [r,g,b,a]
  let sx = x
  let sy = y

  if (variant === 'maskable') {
    bg = [...INK, 255] // plein carré, pas de coin arrondi
    // contenu réduit à 80% autour du centre (zone de sécurité)
    sx = (x - 256) / 0.8 + 256
    sy = (y - 256) / 0.8 + 256
  } else {
    bg = inRoundedRect(x, y, 512, 512, 112) ? [...INK, 255] : [0, 0, 0, 0]
  }

  // Anneau (piste) : stroke width 34 centré sur r=150 → [133,167]
  const d = Math.hypot(sx - 256, sy - 256)
  let out = bg
  if (d >= 133 && d <= 167) out = [...RUN, 255]
  // Éclair par-dessus
  if (pointInPolygon(sx, sy, BOLT)) out = [...GYM, 255]
  return out
}

// Rend une image size×size avec supersampling SxS.
function render(size, variant) {
  const S = 3
  const scale = size / 512
  const data = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sj = 0; sj < S; sj++) {
        for (let si = 0; si < S; si++) {
          const x = (px + (si + 0.5) / S) / scale
          const y = (py + (sj + 0.5) / S) / scale
          const c = colorAt(x, y, variant)
          r += c[0]
          g += c[1]
          b += c[2]
          a += c[3]
        }
      }
      const n = S * S
      const idx = (py * size + px) * 4
      data[idx] = Math.round(r / n)
      data[idx + 1] = Math.round(g / n)
      data[idx + 2] = Math.round(b / n)
      data[idx + 3] = Math.round(a / n)
    }
  }
  return data
}

// ---- Encodage PNG (RGBA, 8 bits) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // couleur RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Ajoute l'octet de filtre (0) par scanline.
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const targets = [
  { file: 'pwa-192.png', size: 192, variant: 'rounded' },
  { file: 'pwa-512.png', size: 512, variant: 'rounded' },
  { file: 'maskable-512.png', size: 512, variant: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, variant: 'maskable' }
]

for (const t of targets) {
  const rgba = render(t.size, t.variant)
  writeFileSync(join(OUT, t.file), encodePNG(t.size, rgba))
  console.log(`✓ ${t.file} (${t.size}×${t.size})`)
}
