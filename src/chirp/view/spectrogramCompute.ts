/**
 * spectrogramCompute.ts
 *
 * Short-time FFT power for the Chirp spectrogram (Hann, typically 87.5 % overlap).
 */
/** Nearest power of two ≥ n (capped). */
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) {
    p <<= 1;
  }
  return p;
}

/** In-place radix-2 Cooley–Tukey FFT on interleaved [re, im, re, im, …]. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = re[i] ?? 0;
      const ti = im[i] ?? 0;
      re[i] = re[j] ?? 0;
      im[i] = im[j] ?? 0;
      re[j] = tr;
      im[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const wR = Math.cos(ang);
    const wI = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let uR = 1;
      let uI = 0;
      for (let k = 0; k < half; k++) {
        const i0 = i + k;
        const i1 = i0 + half;
        const tR = uR * (re[i1] ?? 0) - uI * (im[i1] ?? 0);
        const tI = uR * (im[i1] ?? 0) + uI * (re[i1] ?? 0);
        re[i1] = (re[i0] ?? 0) - tR;
        im[i1] = (im[i0] ?? 0) - tI;
        re[i0] = (re[i0] ?? 0) + tR;
        im[i0] = (im[i0] ?? 0) + tI;
        const nUR = uR * wR - uI * wI;
        uI = uR * wI + uI * wR;
        uR = nUR;
      }
    }
  }
}

export type SpectrogramResult = {
  readonly power: Float64Array; // rows (time) × cols (freq bins), row-major
  readonly nTime: number;
  readonly nFreq: number;
  readonly t0: number;
  readonly dt: number;
  readonly fMin: number;
  readonly fMax: number;
  /** Log-frequency sample frequencies for each column (Hz). */
  readonly freqs: Float64Array;
};

/**
 * Compute a log-frequency spectrogram of `data` sampled at `sampleRate`.
 * Frequency columns are log-spaced between fMin and fMax.
 */
export function computeSpectrogram(
  data: Float64Array,
  sampleRate: number,
  options: {
    readonly fftSize: number;
    readonly hopFraction: number;
    readonly fMin: number;
    readonly fMax: number;
    readonly nFreq?: number;
    readonly t0?: number;
  },
): SpectrogramResult {
  const fftSize = nextPow2(options.fftSize);
  const hop = Math.max(1, Math.floor(fftSize * options.hopFraction));
  const nFreq = options.nFreq ?? 64;
  const t0 = options.t0 ?? 0;
  const hann = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  const nTime = data.length >= fftSize ? 1 + Math.floor((data.length - fftSize) / hop) : 0;
  const freqs = new Float64Array(nFreq);
  const logMin = Math.log(options.fMin);
  const logMax = Math.log(options.fMax);
  for (let i = 0; i < nFreq; i++) {
    freqs[i] = Math.exp(logMin + ((logMax - logMin) * i) / Math.max(1, nFreq - 1));
  }

  const power = new Float64Array(Math.max(0, nTime) * nFreq);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const df = sampleRate / fftSize;

  for (let ti = 0; ti < nTime; ti++) {
    const start = ti * hop;
    for (let i = 0; i < fftSize; i++) {
      re[i] = (data[start + i] ?? 0) * (hann[i] ?? 0);
      im[i] = 0;
    }
    fft(re, im);
    const maxBin = fftSize / 2 - 1;
    for (let fi = 0; fi < nFreq; fi++) {
      const f = freqs[fi] ?? options.fMin;
      const exact = Math.min(maxBin, Math.max(0, f / df));
      const b0 = Math.min(maxBin, Math.max(0, Math.floor(exact)));
      const b1 = Math.min(maxBin, b0 + 1);
      const frac = exact - b0;
      const p0 = (re[b0] ?? 0) ** 2 + (im[b0] ?? 0) ** 2;
      const p1 = (re[b1] ?? 0) ** 2 + (im[b1] ?? 0) ** 2;
      power[ti * nFreq + fi] = p0 + (p1 - p0) * frac;
    }
  }

  return {
    power,
    nTime,
    nFreq,
    t0: t0 + fftSize / 2 / sampleRate,
    dt: hop / sampleRate,
    fMin: options.fMin,
    fMax: options.fMax,
    freqs,
  };
}
