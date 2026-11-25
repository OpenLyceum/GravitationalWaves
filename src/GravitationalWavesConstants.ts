/**
 * GravitationalWavesConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in GravitationalWavesColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import { Range } from "scenerystack/dot";
import { TimeSpeed } from "scenerystack/scenery-phet";
import GravitationalWavesNamespace from "./GravitationalWavesNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/**
 * Corner radius shared by control panels and dialogs.
 * @public
 */
export const PANEL_CORNER_RADIUS = 6;

/** Vertical spacing inside control panels. */
export const PANEL_SPACING = 8;

/** Control-panel column width on Phase-2/3 screens. */
export const CONTROL_PANEL_WIDTH = 240;

/** Chirp control / matched-filter panel width (never scale panels below 1). */
export const CHIRP_PANEL_WIDTH = 240;

/** Chirp bottom-row readout panel width. */
export const CHIRP_READOUTS_WIDTH = 280;

/** Chirp matched-filter panel width (fits 260×110 SNR chart). */
export const CHIRP_MATCHED_WIDTH = 300;

/** Font size for body labels. */
export const LABEL_FONT_SIZE = 14;

/** Font size for numeric readout values. */
export const VALUE_FONT_SIZE = 15;

/** Font size for titles / section headers. */
export const TITLE_FONT_SIZE = 16;

/** Font size for tick labels and captions. */
export const SMALL_FONT_SIZE = 12;

// ── Waves screen ──────────────────────────────────────────────────────────────

/** Visual strain (exaggeration) range for the test-mass ring. */
export const VISUAL_STRAIN_RANGE = new Range(0, 0.4);

/** Default visual strain — large enough that peak stretch/squeeze is obvious. */
export const VISUAL_STRAIN_DEFAULT = 0.2;

/** Animation frequency range (Hz of sim time). */
export const WAVES_FREQUENCY_RANGE = new Range(0.2, 2);

/** Default animation frequency (Hz). */
export const WAVES_FREQUENCY_DEFAULT = 0.5;

/** Log₁₀ of real strain: h = 10^x. */
export const REAL_STRAIN_EXPONENT_RANGE = new Range(-23, -18);

/** Default real-strain exponent (h = 10⁻²¹). */
export const REAL_STRAIN_EXPONENT_DEFAULT = -21;

/** Number of free test masses on the ring. */
export const TEST_MASS_COUNT = 16;

/** Rest radius of the test-mass ring (view pixels). */
export const TEST_MASS_RING_RADIUS = 130;

/** Radius of each peripheral test-mass circle (view pixels). */
export const TEST_MASS_RADIUS = 8;

/** Radius of the central mass (view pixels). */
export const CENTRE_MASS_RADIUS = 12;

/** Deformable grid line count per axis (inclusive). */
export const DEFORM_GRID_LINES = 7;

/** Strain strip chart shows this many oscillation cycles. */
export const STRAIN_CHART_CYCLES = 4;

/** Sample rate for the strain strip (samples per sim-second). */
export const STRAIN_CHART_SAMPLE_RATE = 60;

/** Atom-size comparison threshold for ΔL (m). */
export const ATOM_SIZE_M = 1e-10;

/** Proton-size comparison threshold for ΔL (m). */
export const PROTON_SIZE_M = 1.7e-15;

/** Baseline lengths keyed by baseline id (m). */
export const BASELINE_LENGTHS_M = {
  meter: 1,
  ligo: 4000,
  earthSun: 1.496e11,
} as const;

export type BaselineId = keyof typeof BASELINE_LENGTHS_M;

export type PolarizationId = "plus" | "cross";

// ── Interferometer screen ─────────────────────────────────────────────────────

/** Arm length in kilometres. */
export const ARM_LENGTH_KM_RANGE = new Range(0.1, 10);

/** Default arm length (km) — LIGO-scale. */
export const ARM_LENGTH_KM_DEFAULT = 4;

/** Laser power ratio P_in / P_0 (log-spaced control). */
export const LASER_POWER_RANGE = new Range(0.1, 10);

/** Default laser power ratio. */
export const LASER_POWER_DEFAULT = 1;

/** Source polar angle θ (degrees from zenith). */
export const THETA_DEG_RANGE = new Range(0, 90);

/** Polarization angle ψ (degrees). */
export const PSI_DEG_RANGE = new Range(0, 90);

/** Real incoming strain amplitude. */
export const INTERFEROMETER_STRAIN_AMPLITUDE = 1e-21;

/** Visual animation frequency of the incoming wave (Hz of sim time). */
export const INTERFEROMETER_WAVE_FREQUENCY = 0.5;

/**
 * Visual exaggeration applied only to drawn mirror positions so the fringe
 * motion is visible (readouts stay real).
 */
export const INTERFEROMETER_EXAGGERATION = 5e19;

/** |F₊| and |F×| below this flag a blind spot. */
export const BLIND_SPOT_ANTENNA_THRESHOLD = 1e-3;

/** Output-power strip window (sim seconds). */
export const POWER_CHART_WINDOW_S = 6;

/** Sample rate for the power strip. */
export const POWER_CHART_SAMPLE_RATE = 60;

/** Sensitivity chart frequency range (Hz). */
export const ASD_FREQ_MIN = 10;
export const ASD_FREQ_MAX = 5000;

/** Sensitivity chart ASD range (Hz⁻¹/²). */
export const ASD_MIN = 1e-25;
export const ASD_MAX = 1e-19;

/** Log-spaced ASD sample count for the toy curves. */
export const ASD_SAMPLE_COUNT = 200;

/** Blind-spot preset: θ = 90°, φ = 45°. */
export const BLIND_SPOT_THETA_DEG = 90;
export const BLIND_SPOT_PHI_DEG = 45;

/** Playback speed multipliers shared by both Phase-2 screens. */
export const TIME_SPEED_MULTIPLIERS: ReadonlyMap<TimeSpeed, number> = new Map([
  [TimeSpeed.SLOW, 0.25],
  [TimeSpeed.NORMAL, 1],
  [TimeSpeed.FAST, 2],
]);

/** Manual step size for TimeControlNode step-forward (sim seconds at 60 fps). */
export const STEP_DT = 1 / 60;

// ── Chirp screen ──────────────────────────────────────────────────────────────

/**
 * Root-mean-square sky-and-orientation factor ⟨F⟩ = 2/5 applied to every Chirp
 * amplitude and SNR (doc/model.md).
 */
export const ORIENTATION_FACTOR = 0.4;

/** Component mass range (M☉). */
export const CHIRP_MASS_RANGE = new Range(1, 100);

/** Default component masses (M☉) — GW150914-like. */
export const CHIRP_M1_DEFAULT = 36;
export const CHIRP_M2_DEFAULT = 29;

/** Luminosity distance range (Mpc, log-spaced control). */
export const CHIRP_DISTANCE_RANGE = new Range(10, 5000);

/** Default luminosity distance (Mpc). */
export const CHIRP_DISTANCE_DEFAULT = 450;

/** Default template masses (M☉). */
export const CHIRP_TEMPLATE_M1_DEFAULT = 20;
export const CHIRP_TEMPLATE_M2_DEFAULT = 20;

/** Waveform / whitening sample rate (Hz). */
export const CHIRP_SAMPLE_RATE = 2048;

/** Low-frequency cutoff for time-in-band and SNR integrals (Hz). */
export const CHIRP_F_LOW = 20;

/** Cap displayed / generated inspiral duration (s); BNS shows the last 8 s. */
export const CHIRP_MAX_DURATION_S = 8;

/** Default PRNG seed for whitened noise. */
export const CHIRP_NOISE_SEED_DEFAULT = 1;

/** SNR-scan template chirp-mass bounds (M☉). */
export const CHIRP_SNR_SCAN_MIN_MC = 0.8;
export const CHIRP_SNR_SCAN_MAX_MC = 90;

/** Log-spaced SNR-scan template count. */
export const CHIRP_SNR_SCAN_TEMPLATES = 120;

/** Spectrogram frequency axis (Hz). */
export const CHIRP_SPECTROGRAM_F_MIN = 20;
export const CHIRP_SPECTROGRAM_F_MAX = 500;

/** Short-time FFT length for the spectrogram (samples). */
export const CHIRP_SPECTROGRAM_FFT = 128;

/** Hann-window hop as a fraction of the FFT length (87.5 % overlap ⇒ hop = 0.125). */
export const CHIRP_SPECTROGRAM_HOP_FRACTION = 0.125;

/** Detection threshold on recovered SNR. */
export const CHIRP_DETECTION_SNR = 8;

/** Audio pitch-up factor (one octave) via buffer sample-rate doubling. */
export const CHIRP_AUDIO_PITCH_FACTOR = 2;

/** Fade in/out for chirp audio playback (seconds of audio time). */
export const CHIRP_AUDIO_FADE_S = 0.02;

GravitationalWavesNamespace.register("GravitationalWavesConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  PANEL_SPACING,
  CONTROL_PANEL_WIDTH,
  VISUAL_STRAIN_DEFAULT,
  WAVES_FREQUENCY_DEFAULT,
  REAL_STRAIN_EXPONENT_DEFAULT,
  TEST_MASS_COUNT,
  ARM_LENGTH_KM_DEFAULT,
  LASER_POWER_DEFAULT,
  INTERFEROMETER_STRAIN_AMPLITUDE,
  INTERFEROMETER_WAVE_FREQUENCY,
  INTERFEROMETER_EXAGGERATION,
  ORIENTATION_FACTOR,
  CHIRP_M1_DEFAULT,
  CHIRP_M2_DEFAULT,
  CHIRP_DISTANCE_DEFAULT,
  CHIRP_SAMPLE_RATE,
});
