/**
 * architectHash — URL-safe hash encoding/decoding for Architect Mode grid state.
 *
 * Each cell maps to a nibble index 0–11:
 *   0 = empty, 1 = 2, 2 = 4, 3 = 8, 4 = 16, 5 = 32, 6 = 64,
 *   7 = 128, 8 = 256, 9 = 512, 10 = 1024, 11 = 2048
 *
 * 16 nibbles (4 bits each) are packed into 8 bytes, then base64url-encoded
 * to an 11-character URL-safe string (no padding).
 *
 * Uses btoa/atob (available in browser and jsdom) — NOT Buffer.
 */

export const VALID_TILE_VALUES: readonly number[] = [
  0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048,
]

// Map from tile value to nibble index
const VALUE_TO_NIBBLE: ReadonlyMap<number, number> = new Map(
  VALID_TILE_VALUES.map((v, i) => [v, i])
)

// Map from nibble index to tile value
const NIBBLE_TO_VALUE: readonly number[] = [...VALID_TILE_VALUES]

/**
 * Encodes a 16-element grid (each value must be in VALID_TILE_VALUES) into
 * a compact ~11-character URL-safe base64url string.
 */
export function encodeGridHash(grid: number[]): string {
  const nibbles: number[] = grid.map((v) => {
    const idx = VALUE_TO_NIBBLE.get(v)
    if (idx === undefined) throw new Error(`Invalid tile value: ${v}`)
    return idx
  })

  // Pack 16 nibbles into 8 bytes
  const bytes = new Uint8Array(8)
  for (let i = 0; i < 8; i++) {
    bytes[i] = (nibbles[i * 2] << 4) | nibbles[i * 2 + 1]
  }

  // Convert to binary string for btoa
  const binaryStr = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('')

  // Base64url encode: replace + with -, / with _, strip = padding
  return btoa(binaryStr)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Decodes a base64url hash string back to a 16-element grid of tile values.
 * Returns null if the hash is invalid (wrong length, decode error, out-of-range nibble).
 */
export function decodeGridHash(hash: string): number[] | null {
  if (hash.length !== 11) return null

  // Restore base64url to standard base64.
  // 11 chars of base64url → need 1 '=' to reach multiple of 4 (12 chars).
  const padding = '='.repeat((4 - (hash.length % 4)) % 4)
  const base64 = hash.replace(/-/g, '+').replace(/_/g, '/') + padding

  let binaryStr: string
  try {
    binaryStr = atob(base64)
  } catch {
    return null
  }

  if (binaryStr.length !== 8) return null

  // Unpack nibbles from bytes
  const nibbles: number[] = []
  for (let i = 0; i < 8; i++) {
    const byte = binaryStr.charCodeAt(i)
    const hi = (byte >> 4) & 0x0f
    const lo = byte & 0x0f
    nibbles.push(hi, lo)
  }

  // Validate and map nibble indices to tile values
  const grid: number[] = []
  for (const nibble of nibbles) {
    if (nibble > 11) return null
    grid.push(NIBBLE_TO_VALUE[nibble])
  }

  return grid
}
