/**
 * MatchedFilter.ts
 *
 * Stationary-phase optimal SNR and template match (see doc/model.md, Screen 3).
 */

import { iscoFrequency } from "./Chirp.js";
import { logFrequencyGrid } from "./NoiseModel.js";
import { C, MPC, T_SUN } from "./PhysicalConstants.js";

function chirpTime(mcSolar: number): number {
  return T_SUN * mcSolar;
}

/** Stationary-phase Fourier amplitude |h̃(f)|. */
function stationaryPhaseAmplitude(f: number, mcSolar: number, distanceMpc: number): number {
  const tMc = chirpTime(mcSolar);
  const D = distanceMpc * MPC;
  return Math.sqrt(5 / 24) * Math.PI ** (-2 / 3) * (C / D) * tMc ** (5 / 6) * f ** (-7 / 6);
}

/** Stationary-phase phase Ψ(f; ℳ) = (3/128) (π T_ℳ f)^{-5/3}. */
function stationaryPhase(f: number, mcSolar: number): number {
  return (3 / 128) * (Math.PI * chirpTime(mcSolar) * f) ** (-5 / 3);
}

/** Trapezoidal integral of y over a (possibly irregular) x grid. */
function trapz(x: Float64Array, y: Float64Array): number {
  let sum = 0;
  for (let i = 1; i < x.length; i++) {
    const x0 = x[i - 1] ?? 0;
    const x1 = x[i] ?? 0;
    const y0 = y[i - 1] ?? 0;
    const y1 = y[i] ?? 0;
    sum += 0.5 * (y0 + y1) * (x1 - x0);
  }
  return sum;
}

/**
 * Optimal SNR ρ_opt from the stationary-phase inspiral, integrating on a log
 * grid of at least 400 points from fLow to f_ISCO.
 */
export function optimalSnr(
  mcSolar: number,
  totalMassSolar: number,
  distanceMpc: number,
  asd: (f: number) => number,
  fLow = 20,
): number {
  const fIsco = iscoFrequency(totalMassSolar);
  if (!(fIsco > fLow)) {
    return 0;
  }
  const freqs = logFrequencyGrid(fLow, fIsco, 400);
  const integrand = new Float64Array(freqs.length);
  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i] ?? fLow;
    const hTilde = stationaryPhaseAmplitude(f, mcSolar, distanceMpc);
    const hn = asd(f);
    integrand[i] = (hTilde * hTilde) / (hn * hn);
  }
  return Math.sqrt(4 * trapz(freqs, integrand));
}

/** Noise-weighted norm ∫_{fLow}^{fUpper} f^{-7/3} / h_n² df of a leading-order inspiral (amplitude dropped). */
function inspiralNorm(fUpper: number, asd: (f: number) => number, fLow: number): number {
  if (!(fUpper > fLow)) {
    return 0;
  }
  const freqs = logFrequencyGrid(fLow, fUpper, 300);
  const weight = new Float64Array(freqs.length);
  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i] ?? fLow;
    const hn = asd(f);
    weight[i] = f ** (-7 / 3) / (hn * hn);
  }
  return trapz(freqs, weight);
}

/**
 * Normalized match between a signal (chirp mass `mc`, ending at `fUpperSignal`) and a
 * template (`mcTemplate`, ending at `fUpperTemplate`), maximized over coalescence-time
 * offset Δt ∈ [−0.2, 0.2] s at 0.5 ms steps and over phase (absolute value).
 *
 * The overlap is integrated where both waveforms exist (up to the smaller ISCO); the
 * normalization uses each waveform's own full norm, so a template that ends early is
 * penalized for the signal power it cannot cover. Uses a ~300-point log frequency grid.
 */
export function match(
  mc: number,
  mcTemplate: number,
  fUpperSignal: number,
  fUpperTemplate: number,
  asd: (f: number) => number,
  fLow = 20,
): number {
  const fUpper = Math.min(fUpperSignal, fUpperTemplate);
  if (!(fUpper > fLow)) {
    return 0;
  }
  const denom = Math.sqrt(inspiralNorm(fUpperSignal, asd, fLow) * inspiralNorm(fUpperTemplate, asd, fLow));
  if (!(denom > 0)) {
    return 0;
  }
  const freqs = logFrequencyGrid(fLow, fUpper, 300);
  const weight = new Float64Array(freqs.length);
  const phaseDiff = new Float64Array(freqs.length);
  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i] ?? fLow;
    const hn = asd(f);
    weight[i] = f ** (-7 / 3) / (hn * hn);
    phaseDiff[i] = stationaryPhase(f, mc) - stationaryPhase(f, mcTemplate);
  }

  const dtMin = -0.2;
  const dtMax = 0.2;
  const dtStep = 0.0005;
  let best = 0;

  const realIntegrand = new Float64Array(freqs.length);
  const imagIntegrand = new Float64Array(freqs.length);

  for (let dt = dtMin; dt <= dtMax + 1e-15; dt += dtStep) {
    for (let i = 0; i < freqs.length; i++) {
      const f = freqs[i] ?? fLow;
      const w = weight[i] ?? 0;
      const angle = (phaseDiff[i] ?? 0) + 2 * Math.PI * f * dt;
      realIntegrand[i] = w * Math.cos(angle);
      imagIntegrand[i] = w * Math.sin(angle);
    }
    const re = trapz(freqs, realIntegrand);
    const im = trapz(freqs, imagIntegrand);
    const value = Math.hypot(re, im) / denom;
    if (value > best) {
      best = value;
    }
  }
  return best;
}

export type SnrScanResult = {
  readonly mcTemplate: Float64Array;
  readonly snr: Float64Array;
};

/**
 * Scan recovered SNR = ρ_opt × match over a grid of template chirp masses.
 * Each template is equal-mass with the scanned chirp mass; the integration stops at the
 * smaller of the signal's and the template's ISCO frequencies.
 */
export function snrScan(
  mcSolar: number,
  totalMassSolar: number,
  distanceMpc: number,
  asd: (f: number) => number,
  mcTemplateMin: number,
  mcTemplateMax: number,
  nTemplates: number,
  fLow = 20,
): SnrScanResult {
  const rhoOpt = optimalSnr(mcSolar, totalMassSolar, distanceMpc, asd, fLow);
  const fIsco = iscoFrequency(totalMassSolar);
  const mcTemplate = new Float64Array(nTemplates);
  const snr = new Float64Array(nTemplates);
  const logMin = Math.log(mcTemplateMin);
  const logMax = Math.log(mcTemplateMax);
  for (let i = 0; i < nTemplates; i++) {
    const mcT = nTemplates === 1 ? mcTemplateMin : Math.exp(logMin + ((logMax - logMin) * i) / (nTemplates - 1));
    mcTemplate[i] = mcT;
    // Equal-mass: ℳ = (1/4)^{3/5} M ⇒ M = ℳ · 4^{3/5}.
    const totalTemplate = mcT * 4 ** 0.6;
    snr[i] = rhoOpt * match(mcSolar, mcT, fIsco, iscoFrequency(totalTemplate), asd, fLow);
  }
  return { mcTemplate, snr };
}
