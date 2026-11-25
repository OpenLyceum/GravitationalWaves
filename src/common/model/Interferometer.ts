/**
 * Interferometer.ts
 *
 * Michelson arm lengths, Fabry–Pérot phase difference, and photodetector power
 * (see doc/model.md, Screen 2).
 */

import { LASER_WAVELENGTH } from "./PhysicalConstants.js";

/** Effective number of arm-cavity bounces with Fabry–Pérot cavities on. */
export const FABRY_PEROT_GAIN = 300;

/**
 * Fixed DC readout offset (radians) so the operating point sits on the linear
 * flank of the fringe: P_out = P_in · sin²((Δφ + φ₀)/2). Chosen small (0.05 rad)
 * so the response is nearly linear for tiny Δφ without saturating the fringe.
 */
export const DC_OFFSET_PHASE = 0.05;

/**
 * Arm lengths under differential strain h_det.
 * L_x = L(1 + ½ h_det), L_y = L(1 − ½ h_det); ΔL = h_det L.
 */
export function armLengths(
  L: number,
  hDet: number,
): { readonly lx: number; readonly ly: number; readonly deltaL: number } {
  const half = 0.5 * hDet;
  const lx = L * (1 + half);
  const ly = L * (1 - half);
  // ΔL = h_det L exactly — do not use lx−ly; at LIGO-scale h (~10⁻²¹) that
  // difference underflows to 0 in IEEE-754 double (ulp at 4 km is ~10⁻¹² m).
  return { lx, ly, deltaL: hDet * L };
}

/** Round-trip phase difference Δφ = 4π N ΔL / λ. */
export function phaseDifference(deltaL: number, N: number): number {
  return (4 * Math.PI * N * deltaL) / LASER_WAVELENGTH;
}

/** Photodetector power P_out = P_in · sin²((Δφ + φ₀)/2). */
export function outputPower(Pin: number, deltaPhi: number, phi0: number): number {
  const half = 0.5 * (deltaPhi + phi0);
  const s = Math.sin(half);
  return Pin * s * s;
}
