import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '../public')
mkdirSync(OUT, { recursive: true })

function makePNG(size) {
  const buf = new Uint8Array(size * size * 4)

  function px(x, y, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 4
    const sa = a / 255, da = buf[i+3] / 255
    const oa = sa + da * (1 - sa)
    if (oa === 0) return
    buf[i]   = (r * sa + buf[i]   * da * (1 - sa)) / oa
    buf[i+1] = (g * sa + buf[i+1] * da * (1 - sa)) / oa
    buf[i+2] = (b * sa + buf[i+2] * da * (1 - sa)) / oa
    buf[i+3] = oa * 255
  }

  function fillCircle(cx, cy, r, R, G, B, A = 255) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        const alpha = Math.max(0, Math.min(1, r - d + 0.5))
        if (alpha > 0) px(x, y, R, G, B, Math.round(A * alpha))
      }
    }
  }

  function fillRect(x0, y0, x1, y1, R, G, B, A = 255) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const ax = Math.min(x + 1, x1) - Math.max(x, x0)
        const ay = Math.min(y + 1, y1) - Math.max(y, y0)
        const alpha = Math.max(0, ax) * Math.max(0, ay)
        if (alpha > 0) px(x, y, R, G, B, Math.round(A * alpha))
      }
    }
  }

  // Scanline fill for polygon
  function fillPoly(pts, R, G, B, A = 255) {
    const minY = Math.floor(Math.min(...pts.map(p => p[1])))
    const maxY = Math.ceil(Math.max(...pts.map(p => p[1])))
    for (let y = minY; y <= maxY; y++) {
      const xs = []
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i]
        const [x1, y1] = pts[(i + 1) % pts.length]
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
        }
      }
      xs.sort((a, b) => a - b)
      for (let i = 0; i < xs.length - 1; i += 2) {
        // gradient: amber top → dark orange bottom
        const t = (y - minY) / (maxY - minY)
        const r = Math.round(251 * (1 - t) + 180 * t)
        const g = Math.round(191 * (1 - t) + 90 * t)
        const b = Math.round(36  * (1 - t) + 8   * t)
        fillRect(xs[i], y, xs[i + 1], y + 1, r, g, b, A)
      }
    }
  }

  const s = size
  const cx = s / 2

  // Shield polygon — rounded feel via many points
  const shield = [
    [cx,       s * 0.06],
    [s * 0.84, s * 0.13],
    [s * 0.84, s * 0.50],
    [s * 0.76, s * 0.66],
    [cx,       s * 0.93],
    [s * 0.24, s * 0.66],
    [s * 0.16, s * 0.50],
    [s * 0.16, s * 0.13],
  ]

  fillPoly(shield, 251, 191, 36)

  // Thin dark outline
  for (let i = 0; i < shield.length; i++) {
    const [x0, y0] = shield[i]
    const [x1, y1] = shield[(i + 1) % shield.length]
    const steps = Math.ceil(Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2))
    for (let j = 0; j <= steps; j++) {
      const t = j / steps
      fillCircle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, s * 0.022, 120, 60, 0, 160)
    }
  }

  // --- Keyhole ---
  const kcy = s * 0.42
  const kr  = s * 0.175

  // Outer dark circle
  fillCircle(cx, kcy, kr, 18, 10, 2)

  // Inner cream ring
  fillCircle(cx, kcy, kr * 0.72, 255, 245, 200, 230)

  // Center hole
  fillCircle(cx, kcy, kr * 0.32, 18, 10, 2)

  // Stem
  const sw = kr * 0.44
  const st = kcy + kr * 0.58
  const sb = kcy + kr * 1.6
  fillRect(cx - sw, st, cx + sw, sb, 18, 10, 2)

  // Bottom bar
  fillRect(cx - sw * 1.8, sb - sw * 0.55, cx + sw * 1.8, sb + sw * 0.55, 18, 10, 2)

  return encodePNG(size, buf)
}

function encodePNG(size, rgba) {
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      row[1 + x * 4]     = rgba[i]
      row[1 + x * 4 + 1] = rgba[i + 1]
      row[1 + x * 4 + 2] = rgba[i + 2]
      row[1 + x * 4 + 3] = rgba[i + 3]
    }
    rows.push(row)
  }
  const IHDR = chunk('IHDR', Buffer.from([...u32(size), ...u32(size), 8, 6, 0, 0, 0]))
  const IDAT = chunk('IDAT', deflateSync(Buffer.concat(rows)))
  const IEND = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), IHDR, IDAT, IEND])
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, c])
}
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }
function crc32(buf) {
  if (!crc32.t) {
    crc32.t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      crc32.t[i] = c
    }
  }
  let c = 0xFFFFFFFF
  for (const b of buf) c = crc32.t[(c ^ b) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

for (const size of [16, 48, 128]) {
  writeFileSync(join(OUT, `icon${size}.png`), makePNG(size))
  console.log(`✓ icon${size}.png`)
}
