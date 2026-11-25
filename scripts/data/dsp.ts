/**
 * scripts/data/dsp.ts
 *
 * Radix-2 FFT and GWOSC strain conditioning for `npm run build-data`:
 * Welch ASD, Tukey-windowed whitening, cosine-taper band-pass, decimation, Int16 quantize.
 */

/** In-place radix-2 Cooley–Tukey FFT. `re`/`im` length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  if (n !== im.length || (n & (n - 1)) !== 0) {
    throw new Error(`FFT length must be a power of two (got ${n})`);
  }

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }

  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (sign * (2 * Math.PI)) / len;
    const wLenRe = Math.cos(ang);
    const wLenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j]!;
        const uIm = im[i + j]!;
        const vRe = re[i + j + half]! * wRe - im[i + j + half]! * wIm;
        const vIm = re[i + j + half]! * wIm + im[i + j + half]! * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nextWRe = wRe * wLenRe - wIm * wLenIm;
        wIm = wRe * wLenIm + wIm * wLenRe;
        wRe = nextWRe;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i]! /= n;
      im[i]! /= n;
    }
  }
}

/** Hann window of length `n`. */
function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}

/** Tukey window (cosine-tapered) with shape parameter α ∈ [0, 1]. */
export function tukey(n: number, alpha: number): Float64Array {
  const w = new Float64Array(n);
  const edge = Math.floor((alpha * (n - 1)) / 2);
  for (let i = 0; i < n; i++) {
    if (i < edge) {
      w[i] = 0.5 * (1 + Math.cos(Math.PI * ((2 * i) / (alpha * (n - 1)) - 1)));
    } else if (i > n - 1 - edge) {
      w[i] = 0.5 * (1 + Math.cos(Math.PI * ((2 * i) / (alpha * (n - 1)) - 2 / alpha + 1)));
    } else {
      w[i] = 1;
    }
  }
  return w;
}

/**
 * Welch one-sided ASD estimate (strain / √Hz).
 * Segments of `segmentSeconds` with Hann window and 50 % overlap.
 */
export function welchAsd(
  samples: Float64Array,
  sampleRate: number,
  segmentSeconds = 4,
): { f: Float64Array; asd: Float64Array } {
  const segmentLength = Math.floor(segmentSeconds * sampleRate);
  if ((segmentLength & (segmentLength - 1)) !== 0) {
    throw new Error(`Welch segment length must be a power of two (got ${segmentLength})`);
  }
  const hop = segmentLength >> 1;
  const window = hann(segmentLength);
  let windowPower = 0;
  for (let i = 0; i < segmentLength; i++) {
    windowPower += window[i]! * window[i]!;
  }

  const nFreq = segmentLength / 2 + 1;
  const psdAccum = new Float64Array(nFreq);
  let nSegments = 0;
  for (let start = 0; start + segmentLength <= samples.length; start += hop) {
    const re = new Float64Array(segmentLength);
    const im = new Float64Array(segmentLength);
    for (let i = 0; i < segmentLength; i++) {
      re[i] = samples[start + i]! * window[i]!;
    }
    fft(re, im, false);
    // One-sided periodogram, density in strain²/Hz.
    const scale = 2 / (sampleRate * windowPower);
    psdAccum[0]! += (re[0]! * re[0]! + im[0]! * im[0]!) / (sampleRate * windowPower);
    for (let k = 1; k < nFreq - 1; k++) {
      psdAccum[k]! += scale * (re[k]! * re[k]! + im[k]! * im[k]!);
    }
    const nyquist = nFreq - 1;
    psdAccum[nyquist]! += (re[nyquist]! * re[nyquist]! + im[nyquist]! * im[nyquist]!) / (sampleRate * windowPower);
    nSegments++;
  }
  if (nSegments === 0) {
    throw new Error("Welch: series shorter than one segment");
  }

  const f = new Float64Array(nFreq);
  const asd = new Float64Array(nFreq);
  for (let k = 0; k < nFreq; k++) {
    f[k] = (k * sampleRate) / segmentLength;
    asd[k] = Math.sqrt(psdAccum[k]! / nSegments);
  }
  return { f, asd };
}

/** Linear interpolation of y(x) onto `query`; x must be ascending. */
export function interpolate(x: Float64Array, y: Float64Array, query: number): number {
  if (query <= x[0]!) {
    return y[0]!;
  }
  if (query >= x[x.length - 1]!) {
    return y[y.length - 1]!;
  }
  let lo = 0;
  let hi = x.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (x[mid]! <= query) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const x0 = x[lo]!;
  const x1 = x[hi]!;
  const t = (query - x0) / (x1 - x0);
  return y[lo]! * (1 - t) + y[hi]! * t;
}

/**
 * Frequency-domain whitening of a power-of-two real series:
 * Tukey window → FFT → divide by ASD(f) → IFFT. Returns time-domain whitened strain
 * with approximately unit-variance white noise away from the signal.
 */
export function whiten(
  samples: Float64Array,
  sampleRate: number,
  asdF: Float64Array,
  asdY: Float64Array,
  tukeyAlpha = 0.1,
): Float64Array {
  const n = samples.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`whiten: length must be a power of two (got ${n})`);
  }
  const window = tukey(n, tukeyAlpha);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    re[i] = samples[i]! * window[i]!;
  }
  fft(re, im, false);

  // Divide by ASD; leave DC alone (set to 0) and treat Nyquist.
  re[0] = 0;
  im[0] = 0;
  for (let k = 1; k < n / 2; k++) {
    const freq = (k * sampleRate) / n;
    const hn = Math.max(interpolate(asdF, asdY, freq), 1e-30);
    // One-sided ASD → scale so whitened noise has unit variance per sample roughly:
    // divide complex FFT by (ASD · √(fs / 2)) equivalent via hn * sqrt(n/(2*fs))?
    // Simpler: divide by ASD; overall scale absorbed by later Int16 quantize.
    re[k]! /= hn;
    im[k]! /= hn;
    const kNeg = n - k;
    re[kNeg]! /= hn;
    im[kNeg]! /= hn;
  }
  const nyquist = n / 2;
  const hnNy = Math.max(interpolate(asdF, asdY, sampleRate / 2), 1e-30);
  re[nyquist]! /= hnNy;
  im[nyquist]! /= hnNy;

  fft(re, im, true);
  return re;
}

/**
 * Zero FFT bins outside [fLow, fHigh] with `taperHz` cosine ramps at each edge.
 * Operates in place on a time series (FFT → mask → IFFT). Length must be 2^n.
 */
export function bandPass(
  samples: Float64Array,
  sampleRate: number,
  fLow: number,
  fHigh: number,
  taperHz = 5,
): Float64Array {
  const n = samples.length;
  const re = samples.slice();
  const im = new Float64Array(n);
  fft(re, im, false);

  const taper = (freq: number, edge: number, rising: boolean): number => {
    if (rising) {
      if (freq <= edge - taperHz) {
        return 0;
      }
      if (freq >= edge) {
        return 1;
      }
      const x = (freq - (edge - taperHz)) / taperHz;
      return 0.5 - 0.5 * Math.cos(Math.PI * x);
    }
    if (freq >= edge + taperHz) {
      return 0;
    }
    if (freq <= edge) {
      return 1;
    }
    const x = (freq - edge) / taperHz;
    return 0.5 + 0.5 * Math.cos(Math.PI * x);
  };

  for (let k = 0; k <= n / 2; k++) {
    const freq = (k * sampleRate) / n;
    const gain = taper(freq, fLow, true) * taper(freq, fHigh, false);
    re[k]! *= gain;
    im[k]! *= gain;
    if (k > 0 && k < n / 2) {
      const kNeg = n - k;
      re[kNeg]! *= gain;
      im[kNeg]! *= gain;
    }
  }

  fft(re, im, true);
  return re;
}

/** Keep every `factor`-th sample starting at index 0. */
export function decimate(samples: Float64Array, factor: number): Float64Array {
  const out = new Float64Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i++) {
    out[i] = samples[i * factor]!;
  }
  return out;
}

/** Quantize to Int16 with a scale factor: sample ≈ stored * scale. */
export function quantizeInt16(samples: Float64Array): { scale: number; samples: number[] } {
  let maxAbs = 0;
  for (const sample of samples) {
    const a = Math.abs(sample);
    if (a > maxAbs) {
      maxAbs = a;
    }
  }
  const scale = maxAbs > 0 ? maxAbs / 32767 : 1;
  const out: number[] = [];
  for (const sample of samples) {
    out.push(Math.max(-32768, Math.min(32767, Math.round(sample / scale))));
  }
  return { scale, samples: out };
}

/** Log-spaced grid inclusive of endpoints. */
export function logGrid(fMin: number, fMax: number, n: number): Float64Array {
  const g = new Float64Array(n);
  const logMin = Math.log(fMin);
  const logMax = Math.log(fMax);
  for (let i = 0; i < n; i++) {
    g[i] = Math.exp(logMin + ((logMax - logMin) * i) / Math.max(n - 1, 1));
  }
  return g;
}
