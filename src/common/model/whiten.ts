/**
 * whiten.ts
 *
 * Approximate whitened strain and seeded unit-variance Gaussian noise
 * (see doc/model.md, “Whitened detector output”).
 */

/**
 * Whitened signal w_i = h_i · √(2/f_s) / h_n(f_i).
 * When f_i ≤ 0 (post-merger / silent), evaluate the ASD at `ringdownFrequency`.
 */
export function whitenedSignal(
  h: Float64Array,
  f: Float64Array,
  asd: (frequency: number) => number,
  sampleRate: number,
  ringdownFrequency: number,
): Float64Array {
  const scale = Math.sqrt(2 / sampleRate);
  const out = new Float64Array(h.length);
  for (let i = 0; i < h.length; i++) {
    const freq = f[i] ?? 0;
    const fEval = freq > 0 ? freq : ringdownFrequency;
    const hn = asd(fEval);
    out[i] = ((h[i] ?? 0) * scale) / hn;
  }
  return out;
}

/**
 * Mulberry32 PRNG plus Box–Muller Gaussian draws. Used so detector noise is
 * reproducible across runs (no Math.random).
 */
class SeededRandom {
  private state: number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Standard normal via Box–Muller. */
  gaussian(): number {
    if (this.spare !== null) {
      const value = this.spare;
      this.spare = null;
      return value;
    }
    let u = 0;
    // Avoid log(0).
    do {
      u = this.next();
    } while (u === 0);
    const v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v);
    this.spare = mag * Math.sin(2 * Math.PI * v);
    return z0;
  }
}

/** n independent N(0,1) samples from a seeded generator. */
export function whiteNoise(n: number, seed: number): Float64Array {
  const rng = new SeededRandom(seed);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = rng.gaussian();
  }
  return out;
}
