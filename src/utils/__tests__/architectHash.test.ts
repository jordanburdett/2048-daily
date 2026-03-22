import { describe, it, expect } from 'vitest'
import {
  VALID_TILE_VALUES,
  encodeGridHash,
  decodeGridHash,
} from '../architectHash'

describe('architectHash', () => {
  describe('VALID_TILE_VALUES', () => {
    it('contains the expected 12 values', () => {
      expect(VALID_TILE_VALUES).toEqual([
        0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048,
      ])
    })
  })

  describe('encodeGridHash / decodeGridHash round-trips', () => {
    it('round-trips a grid of all zeros (empty board)', () => {
      const grid = Array(16).fill(0)
      const hash = encodeGridHash(grid)
      expect(hash).toHaveLength(11)
      expect(decodeGridHash(hash)).toEqual(grid)
    })

    it('round-trips a grid with mixed power-of-two values', () => {
      const grid = [
        2, 4, 8, 16,
        32, 64, 128, 256,
        512, 1024, 2048, 0,
        0, 2, 4, 8,
      ]
      const hash = encodeGridHash(grid)
      expect(hash).toHaveLength(11)
      expect(decodeGridHash(hash)).toEqual(grid)
    })

    it('round-trips a fully filled board with mixed powers', () => {
      const grid = [
        2048, 1024, 512, 256,
        128, 64, 32, 16,
        8, 4, 2, 2048,
        1024, 512, 256, 128,
      ]
      const hash = encodeGridHash(grid)
      expect(hash).toHaveLength(11)
      expect(decodeGridHash(hash)).toEqual(grid)
    })

    it('produces a URL-safe hash (no +, /, or = characters)', () => {
      const grid = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 0, 0, 0, 0, 0]
      const hash = encodeGridHash(grid)
      expect(hash).not.toMatch(/[+/=]/)
    })
  })

  describe('decodeGridHash — invalid inputs', () => {
    it('returns null for a string with wrong length (too short)', () => {
      expect(decodeGridHash('AAAAAAAAAA')).toBeNull() // 10 chars
    })

    it('returns null for a string with wrong length (too long)', () => {
      expect(decodeGridHash('AAAAAAAAAAAA')).toBeNull() // 12 chars
    })

    it('returns null for an empty string', () => {
      expect(decodeGridHash('')).toBeNull()
    })

    it('returns null for a malformed/garbage string of length 11', () => {
      // '!!!!!!!!!!!' is not valid base64 — atob will throw
      expect(decodeGridHash('!!!!!!!!!!!')).toBeNull()
    })

    it('returns null when a nibble value exceeds 11', () => {
      // Craft a byte where the high nibble = 0xC (12) — above the max index of 11
      // byte = 0xC0 (high nibble 12, low nibble 0)
      const badByte = 0xc0
      const bytes = new Uint8Array([badByte, 0, 0, 0, 0, 0, 0, 0])
      const binaryStr = Array.from(bytes)
        .map((b) => String.fromCharCode(b))
        .join('')
      const base64url = btoa(binaryStr)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      expect(base64url).toHaveLength(11)
      expect(decodeGridHash(base64url)).toBeNull()
    })
  })
})
