/**
 * NoiseModel.ts
 *
 * Toy three-term LIGO-like strain amplitude spectral density (see doc/model.md).
 */

/** Reference arm length (m). */
const L0 = 4000;

/** Reference Fabry–Pérot gain. */
const N0 = 300;

/** Tiny floor when every noise term is disabled (avoids divide-by-zero). */
const ASD_FLOOR = 1e-30;

export type NoiseParams = {
  readonly L: number;
  readonly N: number;
  /** P_in / P_0 (default laser power normalized to 1). */
  readonly powerRatio: number;
};

export type NoiseEnabled = {
  readonly seismic: boolean;
  readonly thermal: boolean;
  readonly shot: boolean;
};

/** Seismic strain ASD ~ f⁻⁴ / L. */
export function seismicAsd(f: number, L: number): number {
  const ratio = 10 / f;
  return 1.0e-22 * (L0 / L) * ratio ** 4;
}

/** Thermal (suspension) strain ASD ~ f⁻½ / L. */
export function thermalAsd(f: number, L: number): number {
  return 3.0e-24 * (L0 / L) * Math.sqrt(100 / f);
}

/** Shot-noise strain ASD ~ √(1+(f/150)²) / (L N √P). */
export function shotAsd(f: number, L: number, N: number, powerRatio: number): number {
  const cavity = (L0 * N0) / (L * N);
  const power = Math.sqrt(1 / powerRatio);
  const optical = Math.sqrt(1 + (f / 150) ** 2);
  return 2.5e-24 * cavity * power * optical;
}

/**
 * Quadrature sum of the enabled terms. Returns {@link ASD_FLOOR} if none are on.
 */
export function totalAsd(f: number, params: NoiseParams, enabled: NoiseEnabled): number {
  let sumSq = 0;
  if (enabled.seismic) {
    const h = seismicAsd(f, params.L);
    sumSq += h * h;
  }
  if (enabled.thermal) {
    const h = thermalAsd(f, params.L);
    sumSq += h * h;
  }
  if (enabled.shot) {
    const h = shotAsd(f, params.L, params.N, params.powerRatio);
    sumSq += h * h;
  }
  return sumSq > 0 ? Math.sqrt(sumSq) : ASD_FLOOR;
}

/** Logarithmically spaced frequency grid (inclusive endpoints). */
export function logFrequencyGrid(fMin: number, fMax: number, n: number): Float64Array {
  const grid = new Float64Array(n);
  if (n === 1) {
    grid[0] = fMin;
    return grid;
  }
  const logMin = Math.log(fMin);
  const logMax = Math.log(fMax);
  const step = (logMax - logMin) / (n - 1);
  for (let i = 0; i < n; i++) {
    grid[i] = Math.exp(logMin + i * step);
  }
  return grid;
}
