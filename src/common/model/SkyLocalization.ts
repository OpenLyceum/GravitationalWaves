/**
 * SkyLocalization.ts
 *
 * Toy sky localization by triangulation (see doc/model.md, "Screen 4 — Network").
 * Each detector reports an arrival time and an SNR. For every direction on a 1° grid the
 * posterior is
 *
 *   ln P = −½ (χ²_time + χ²_amp)
 *
 * χ²_time compares observed arrival times with the light-travel delays for that direction,
 * with the unknown geocentre time marginalized (fitted) and timing error σ_t = 1/(2π σ_f ρ).
 * χ²_amp compares observed SNRs with the detector responses for that direction, with the
 * unknown overall amplitude fitted and unit noise per detector.
 */

import {
  arrivalDelay,
  circularResponse,
  type DetectorGeometry,
  lightTravelTime,
  unitVector,
  type Vec3,
} from "./DetectorNetwork.js";

/** Effective signal bandwidth σ_f (Hz) in the timing error σ_t = 1/(2π σ_f ρ). */
const EFFECTIVE_BANDWIDTH = 100;

/** Grid resolution (degrees). Longitude −180..180, latitude 90..−90 at cell centres. */
export const SKY_GRID_STEP_DEG = 1;
export const SKY_GRID_WIDTH = 360 / SKY_GRID_STEP_DEG;
export const SKY_GRID_HEIGHT = 180 / SKY_GRID_STEP_DEG;
const CELL_COUNT = SKY_GRID_WIDTH * SKY_GRID_HEIGHT;

/** Whole sky in square degrees. */
export const FULL_SKY_DEG2 = 4 * Math.PI * (180 / Math.PI) ** 2;

/** SNR floor so a detector in a blind spot still has a finite timing error. */
const MIN_TIMING_SNR = 0.5;

/** Histogram of ln(density) used to find credible regions. */
const HISTOGRAM_BINS = 3000;
const LN_DENSITY_FLOOR = -60;

const DEG = Math.PI / 180;

/** What one detector measured. */
export type DetectorObservation = {
  readonly detector: DetectorGeometry;
  /** Arrival time (s); any common offset is allowed. */
  readonly time: number;
  /** Matched-filter SNR in this detector. */
  readonly snr: number;
  /** Relative sensitivity (1 = reference detector), multiplies the response. */
  readonly sensitivity: number;
};

export type SkyMap = {
  /** Posterior density per unit solid angle, max = 1, row-major from north (row 0) to south. */
  readonly density: Float64Array;
  /** Area of the 90 % credible region (deg²). */
  readonly area90: number;
  /** Area of the 50 % credible region (deg²). */
  readonly area50: number;
  /** Density threshold enclosing 90 % of the probability (for contouring). */
  readonly threshold90: number;
  /** Longitude, latitude (radians) of the most probable cell. */
  readonly peakLon: number;
  readonly peakLat: number;
};

/** Timing error (s) for a given SNR. */
export function timingError(snr: number): number {
  return 1 / (2 * Math.PI * EFFECTIVE_BANDWIDTH * Math.max(snr, MIN_TIMING_SNR));
}

/** Longitude and latitude (radians) of grid cell (column, row). */
export function cellCentre(column: number, row: number): { readonly lon: number; readonly lat: number } {
  return {
    lon: (-180 + (column + 0.5) * SKY_GRID_STEP_DEG) * DEG,
    lat: (90 - (row + 0.5) * SKY_GRID_STEP_DEG) * DEG,
  };
}

/**
 * Posterior density at (lon, lat) in radians: the cell that contains that direction.
 * Returns 0 when the map is empty.
 */
export function densityAt(map: SkyMap, lon: number, lat: number): number {
  if (map.density.length === 0) {
    return 0;
  }
  const lonDeg = Math.max(-180, Math.min(180 - 1e-9, lon / DEG));
  const latDeg = Math.max(-90, Math.min(90, lat / DEG));
  const column = Math.min(SKY_GRID_WIDTH - 1, Math.max(0, Math.floor((lonDeg + 180) / SKY_GRID_STEP_DEG)));
  const row = Math.min(SKY_GRID_HEIGHT - 1, Math.max(0, Math.floor((90 - latDeg) / SKY_GRID_STEP_DEG)));
  return map.density[row * SKY_GRID_WIDTH + column] ?? 0;
}

type DetectorGrids = { readonly delay: Float64Array; readonly response: Float64Array };

const gridCache = new WeakMap<DetectorGeometry, DetectorGrids>();

/** Arrival delay and circular response of one detector at every grid cell (cached). */
function detectorGrids(detector: DetectorGeometry): DetectorGrids {
  const cached = gridCache.get(detector);
  if (cached) {
    return cached;
  }
  const delay = new Float64Array(CELL_COUNT);
  const response = new Float64Array(CELL_COUNT);
  for (let row = 0; row < SKY_GRID_HEIGHT; row++) {
    for (let column = 0; column < SKY_GRID_WIDTH; column++) {
      const { lon, lat } = cellCentre(column, row);
      const index = row * SKY_GRID_WIDTH + column;
      delay[index] = arrivalDelay(detector, lon, lat);
      response[index] = circularResponse(detector, lon, lat).amplitude;
    }
  }
  const grids = { delay, response };
  gridCache.set(detector, grids);
  return grids;
}

/** One detector's data in the form the inner loop needs. */
type Term = {
  readonly time: number;
  readonly snr: number;
  readonly sensitivity: number;
  readonly weight: number;
  readonly grids: DetectorGrids;
};

/** −½(χ²_time + χ²_amp) at one cell. */
function logPosterior(terms: readonly Term[], index: number, weightSum: number, snrSquared: number): number {
  let weightedMean = 0;
  for (const term of terms) {
    weightedMean += term.weight * (term.time - (term.grids.delay[index] ?? 0));
  }
  weightedMean /= weightSum;
  let chiTime = 0;
  let overlap = 0;
  let model = 0;
  for (const term of terms) {
    const r = term.time - (term.grids.delay[index] ?? 0) - weightedMean;
    chiTime += term.weight * r * r;
    const s = term.sensitivity * (term.grids.response[index] ?? 0);
    overlap += term.snr * s;
    model += s * s;
  }
  const chiAmp = model > 0 ? snrSquared - (overlap * overlap) / model : snrSquared;
  return -0.5 * (chiTime + chiAmp);
}

/** Cell areas (deg²) by row. */
const ROW_AREA = Float64Array.from(
  { length: SKY_GRID_HEIGHT },
  (_, row) => SKY_GRID_STEP_DEG * SKY_GRID_STEP_DEG * Math.cos(cellCentre(0, row).lat),
);

/**
 * Areas of the 50 % and 90 % credible regions from a histogram of ln(density): bins are
 * added from the densest down; within the bin that crosses a target, the needed fraction
 * of its area is taken (cells in one bin have nearly equal density).
 */
function credibleAreas(logDensity: Float64Array): { area50: number; area90: number; threshold90: number } {
  const binMass = new Float64Array(HISTOGRAM_BINS);
  const binArea = new Float64Array(HISTOGRAM_BINS);
  let total = 0;
  for (let index = 0; index < CELL_COUNT; index++) {
    const ln = Math.max(logDensity[index] ?? LN_DENSITY_FLOOR, LN_DENSITY_FLOOR);
    const bin = Math.min(HISTOGRAM_BINS - 1, Math.floor((1 - ln / LN_DENSITY_FLOOR) * HISTOGRAM_BINS));
    const area = ROW_AREA[Math.floor(index / SKY_GRID_WIDTH)] ?? 0;
    const mass = Math.exp(ln) * area;
    binMass[bin] = (binMass[bin] ?? 0) + mass;
    binArea[bin] = (binArea[bin] ?? 0) + area;
    total += mass;
  }
  let cumulative = 0;
  let area = 0;
  let area50 = 0;
  for (let bin = HISTOGRAM_BINS - 1; bin >= 0; bin--) {
    const mass = binMass[bin] ?? 0;
    const cells = binArea[bin] ?? 0;
    if (mass === 0) {
      continue;
    }
    const next = cumulative + mass;
    if (area50 === 0 && next >= 0.5 * total) {
      area50 = area + (cells * (0.5 * total - cumulative)) / mass;
    }
    if (next >= 0.9 * total) {
      return {
        area50,
        area90: area + (cells * (0.9 * total - cumulative)) / mass,
        threshold90: Math.exp(LN_DENSITY_FLOOR * (1 - bin / HISTOGRAM_BINS)),
      };
    }
    cumulative = next;
    area += cells;
  }
  return { area50: FULL_SKY_DEG2 / 2, area90: FULL_SKY_DEG2, threshold90: 0 };
}

/** Computes the posterior sky map for a set of observations. */
export function localize(observations: readonly DetectorObservation[]): SkyMap {
  const terms: Term[] = observations.map((o) => ({
    time: o.time,
    snr: o.snr,
    sensitivity: o.sensitivity,
    weight: 1 / timingError(o.snr) ** 2,
    grids: detectorGrids(o.detector),
  }));
  const weightSum = terms.reduce((sum, term) => sum + term.weight, 0);
  const snrSquared = terms.reduce((sum, term) => sum + term.snr * term.snr, 0);

  // One detector (or none) constrains nothing: a flat map.
  const logDensity = new Float64Array(CELL_COUNT);
  let maxLog = 0;
  let peak = 0;
  if (terms.length >= 2) {
    maxLog = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < CELL_COUNT; index++) {
      const value = logPosterior(terms, index, weightSum, snrSquared);
      logDensity[index] = value;
      if (value > maxLog) {
        maxLog = value;
        peak = index;
      }
    }
  }

  const density = new Float64Array(CELL_COUNT);
  for (let index = 0; index < CELL_COUNT; index++) {
    const ln = (logDensity[index] ?? 0) - maxLog;
    logDensity[index] = ln;
    density[index] = Math.exp(ln);
  }

  const peakCell = cellCentre(peak % SKY_GRID_WIDTH, Math.floor(peak / SKY_GRID_WIDTH));
  return { density, ...credibleAreas(logDensity), peakLon: peakCell.lon, peakLat: peakCell.lat };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * Directions (lon, lat in radians) on the ring of constant delay t_a − t_b = dt: a circle
 * around the baseline from b to a. Returns an empty array if |dt| exceeds the light-travel time.
 */
export function delayRing(
  a: DetectorGeometry,
  b: DetectorGeometry,
  dt: number,
  points = 180,
): Array<{ readonly lon: number; readonly lat: number }> {
  const cosAngle = -dt / lightTravelTime(a, b);
  if (Math.abs(cosAngle) > 1) {
    return [];
  }
  const sinAngle = Math.sqrt(1 - cosAngle * cosAngle);
  const axis = normalize([a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]]);
  const u = normalize(cross(axis, Math.abs(axis[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const v = cross(axis, u);
  const ring: Array<{ lon: number; lat: number }> = [];
  for (let k = 0; k <= points; k++) {
    const phi = (2 * Math.PI * k) / points;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const x = cosAngle * axis[0] + sinAngle * (c * u[0] + s * v[0]);
    const y = cosAngle * axis[1] + sinAngle * (c * u[1] + s * v[1]);
    const z = cosAngle * axis[2] + sinAngle * (c * u[2] + s * v[2]);
    ring.push({ lon: Math.atan2(y, x), lat: Math.asin(Math.max(-1, Math.min(1, z))) });
  }
  return ring;
}

/** Angular distance (radians) between two directions. */
export function angularSeparation(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const p = unitVector(lon1, lat1);
  const q = unitVector(lon2, lat2);
  return Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2])));
}
