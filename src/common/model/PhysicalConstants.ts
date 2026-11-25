/**
 * PhysicalConstants.ts
 *
 * SI constants used by the gravitational-wave physics modules (see doc/model.md).
 */

/** Newton's gravitational constant (m³ kg⁻¹ s⁻²). */
const G = 6.6743e-11;

/** Speed of light (m/s). */
export const C = 2.99792458e8;

/** Solar mass (kg). */
const M_SUN = 1.98841e30;

/** G·M_☉/c³ (s) — convenient time unit for binary waveforms. */
export const T_SUN = (G * M_SUN) / C ** 3;

/** Megaparsec in metres. */
export const MPC = 3.085678e22;

/** LIGO laser wavelength (m) — 1064 nm Nd:YAG. */
export const LASER_WAVELENGTH = 1064e-9;
