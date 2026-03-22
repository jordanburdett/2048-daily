/**
 * AudioEngine — Web Audio API sound effects for 2048 Daily.
 *
 * AudioContext is lazily initialized on the first play*() call to satisfy
 * browser autoplay policies (AudioContext must be created in a user gesture).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    return this.ctx
  }

  /** Soft whoosh: filtered noise sweep 80 Hz → 40 Hz, 60 ms */
  playSlide(): void {
    try {
      const ctx = this.getCtx()
      const bufferSize = ctx.sampleRate * 0.06 // 60 ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const source = ctx.createBufferSource()
      source.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(80, ctx.currentTime)
      filter.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.06)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06)

      source.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      source.start()
      source.stop(ctx.currentTime + 0.06)
    } catch {
      // Silently ignore audio errors
    }
  }

  /** Bright pop: 660 Hz triangle wave, 40 ms with fast decay */
  playMerge(): void {
    try {
      const ctx = this.getCtx()
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(660, ctx.currentTime)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.04)
    } catch {
      // Silently ignore audio errors
    }
  }

  /**
   * Chime that escalates by tier.
   * tier 1 (128): C5 sine 200ms
   * tier 2 (256): C5-E5 200ms each
   * tier 3 (512): C5-E5-G5 150ms each
   * tier 4 (1024): C5-E5-G5-C6 120ms each
   * tier 5 (2048): C5-E5-G5-C6-E6 100ms each
   */
  playMilestone(tier: 1 | 2 | 3 | 4 | 5): void {
    const notesByTier: Record<number, number[]> = {
      1: [523.25],
      2: [523.25, 659.25],
      3: [523.25, 659.25, 783.99],
      4: [523.25, 659.25, 783.99, 1046.5],
      5: [523.25, 659.25, 783.99, 1046.5, 1318.5],
    }
    const durationByTier: Record<number, number> = {
      1: 0.2,
      2: 0.2,
      3: 0.15,
      4: 0.12,
      5: 0.1,
    }

    try {
      const ctx = this.getCtx()
      const notes = notesByTier[tier]
      const dur = durationByTier[tier]

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)

        const gain = ctx.createGain()
        const startTime = ctx.currentTime + i * dur
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + dur)
      })
    } catch {
      // Silently ignore audio errors
    }
  }

  /** Descending minor chord: 440 → 330 → 220 Hz, 200 ms each */
  playGameOver(): void {
    try {
      const ctx = this.getCtx()
      const freqs = [440, 330, 220]
      const dur = 0.2

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)

        const gain = ctx.createGain()
        const startTime = ctx.currentTime + i * dur
        gain.gain.setValueAtTime(0.2, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + dur)
      })
    } catch {
      // Silently ignore audio errors
    }
  }

  /** Ascending arpeggio: C5-E5-G5-C6, 100 ms each */
  playHighScore(): void {
    try {
      const ctx = this.getCtx()
      const freqs = [523.25, 659.25, 783.99, 1046.5]
      const dur = 0.1

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)

        const gain = ctx.createGain()
        const startTime = ctx.currentTime + i * dur
        gain.gain.setValueAtTime(0.25, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + dur)
      })
    } catch {
      // Silently ignore audio errors
    }
  }

  /** Soft tick: 440 Hz triangle 30 ms */
  playNewTile(): void {
    try {
      const ctx = this.getCtx()
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, ctx.currentTime)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.03)
    } catch {
      // Silently ignore audio errors
    }
  }
}
