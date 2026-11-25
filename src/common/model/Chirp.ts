/**
 * Chirp.ts
 *
 * Leading-order (Newtonian) inspiral plus a phenomenological merger/ringdown
 * (see doc/model.md, Screen 3). Masses are detector-frame solar masses.
 *
 * Convention: t = 0 is the ISCO cut (labelled “merger” in the sim). The Newtonian
 * time-to-coalescence at that instant is τ_ISCO = timeInBand(f_ISCO, ℳ), so the
 * inspiral at time t ≤ 0 uses τ = τ_ISCO − t.
 */

import { C, MPC, T_SUN } from "./PhysicalConstants.js";

/** Nearest integer; avoids Math.round (biome plugin) while staying SceneryStack-free. */
function nearestInt(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : -Math.floor(-value + 0.5);
}

/** Chirp mass ℳ = (m₁ m₂)^{3/5} / M^{1/5} in solar masses. */
export function chirpMass(m1: number, m2: number): number {
  const total = m1 + m2;
  return (m1 * m2) ** 0.6 / total ** 0.2;
}

/** Chirp time unit T_ℳ = T_☉ · ℳ/M_☉ (seconds). */
function chirpTime(mcSolar: number): number {
  return T_SUN * mcSolar;
}

/**
 * Instantaneous GW frequency at Newtonian time-to-coalescence τ (s):
 * f(τ) = (1/π) (5/(256 τ))^{3/8} T_ℳ^{-5/8}.
 */
function gwFrequency(tau: number, mcSolar: number): number {
  if (!(tau > 0)) {
    return Number.POSITIVE_INFINITY;
  }
  const tMc = chirpTime(mcSolar);
  return (1 / Math.PI) * (5 / (256 * tau)) ** 0.375 * tMc ** -0.625;
}

/**
 * GW phase Φ(τ) = −2 (τ / (5 T_ℳ))^{5/8} with Φ_c = 0.
 */
function gwPhase(tau: number, mcSolar: number): number {
  if (!(tau > 0)) {
    return 0;
  }
  const tMc = chirpTime(mcSolar);
  return -2 * (tau / (5 * tMc)) ** 0.625;
}

/**
 * Strain amplitude A(τ) = (4c/D) T_ℳ^{5/3} (π f(τ))^{2/3} for an optimally oriented source.
 */
function amplitude(tau: number, mcSolar: number, distanceMpc: number): number {
  const freq = gwFrequency(tau, mcSolar);
  if (!Number.isFinite(freq)) {
    return 0;
  }
  const tMc = chirpTime(mcSolar);
  const D = distanceMpc * MPC;
  return ((4 * C) / D) * tMc ** (5 / 3) * (Math.PI * freq) ** (2 / 3);
}

/**
 * Time spent above frequency f (time in band):
 * τ(f) = (5/256) T_ℳ^{-5/3} (π f)^{-8/3}.
 */
export function timeInBand(fLow: number, mcSolar: number): number {
  const tMc = chirpTime(mcSolar);
  return (5 / 256) * tMc ** (-5 / 3) * (Math.PI * fLow) ** (-8 / 3);
}

/** ISCO GW frequency f_ISCO = 1 / (6^{3/2} π T_M) with T_M = G M / c³. */
export function iscoFrequency(totalMassSolar: number): number {
  const tM = T_SUN * totalMassSolar;
  return 1 / (6 ** 1.5 * Math.PI * tM);
}

/** Ringdown frequency f_ring = 0.0844 / T_{M_f}. */
export function ringdownFrequency(finalMassSolar: number): number {
  return 0.0844 / (T_SUN * finalMassSolar);
}

export type WaveformParams = {
  readonly m1: number;
  readonly m2: number;
  readonly distanceMpc: number;
  readonly sampleRate: number;
  readonly duration: number;
};

export type Waveform = {
  readonly t: Float64Array;
  readonly h: Float64Array;
  /** Quadrature (90° phase-shifted) strain, A sin Φ: the × polarization of a face-on source. */
  readonly hQuadrature: Float64Array;
  readonly f: Float64Array;
  readonly mergerIndex: number;
};

/**
 * Generate a strain waveform. t = 0 is the ISCO cut; samples run from −duration
 * to roughly +0.1 s. Systems with M < 5 M_☉ have no ringdown (signal zero after ISCO).
 */
export function generateWaveform(params: WaveformParams): Waveform {
  const { m1, m2, distanceMpc, sampleRate, duration } = params;
  const mc = chirpMass(m1, m2);
  const totalMass = m1 + m2;
  const fIsco = iscoFrequency(totalMass);
  const tauIsco = timeInBand(fIsco, mc);
  const includeRingdown = totalMass >= 5;

  const n = nearestInt((duration + 0.1) * sampleRate);
  const t = new Float64Array(n);
  const h = new Float64Array(n);
  const hq = new Float64Array(n);
  const fArr = new Float64Array(n);
  const mergerIndex = Math.min(nearestInt(duration * sampleRate), n - 1);

  const phaseIsco = gwPhase(tauIsco, mc);
  const ampIsco = amplitude(tauIsco, mc, distanceMpc);

  let fRing = 0;
  let tauRing = 0;
  let rampDuration = 0;
  if (includeRingdown) {
    fRing = ringdownFrequency(0.95 * totalMass);
    tauRing = 3.2 / (Math.PI * fRing);
    rampDuration = 1 / fRing;
  }

  // Phase continuous at the cut; integrate 2π f dt through the ringdown.
  let ringPhase = phaseIsco;
  let prevPostMergerT = 0;

  for (let i = 0; i < n; i++) {
    const ti = -duration + i / sampleRate;
    t[i] = ti;

    if (ti <= 0) {
      // Inspiral: Newtonian τ = τ_ISCO − t  (≥ τ_ISCO).
      const tau = tauIsco - ti;
      fArr[i] = gwFrequency(tau, mc);
      const a = amplitude(tau, mc, distanceMpc);
      const phase = gwPhase(tau, mc);
      h[i] = a * Math.cos(phase);
      hq[i] = a * Math.sin(phase);
      continue;
    }

    if (!includeRingdown) {
      fArr[i] = 0;
      continue;
    }

    const freq = ti < rampDuration ? fIsco + (fRing - fIsco) * (ti / rampDuration) : fRing;
    const dt = ti - prevPostMergerT;
    ringPhase += 2 * Math.PI * freq * dt;
    fArr[i] = freq;
    const ringAmplitude = ampIsco * Math.exp(-ti / tauRing);
    h[i] = ringAmplitude * Math.cos(ringPhase);
    hq[i] = ringAmplitude * Math.sin(ringPhase);
    prevPostMergerT = ti;
  }

  return { t, h, hQuadrature: hq, f: fArr, mergerIndex };
}
