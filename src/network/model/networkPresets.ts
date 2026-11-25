/**
 * networkPresets.ts
 *
 * Real detections for the Network screen (see doc/model.md, "Screen 4 — Network").
 * Per-detector SNRs are from the discovery papers; sky positions are the host galaxy
 * (GW170817) or the centre of the published 90 % region (GW170814). GW150914 has no
 * single true position — its arrival-time difference is measured from the bundled
 * GWOSC strain by cross-correlation, and the screen shows the ring it allows.
 */

import type { DetectorId } from "../../common/model/DetectorNetwork.js";

export type NetworkPresetId = "GW150914" | "GW170814" | "GW170817";

export type NetworkPreset = {
  readonly id: NetworkPresetId;
  /** Catalog id in the bundled event library (for masses and the GWOSC credit). */
  readonly eventId: string;
  readonly gps: number;
  readonly detectors: readonly DetectorId[];
  /** Matched-filter SNR in each detector (discovery papers; GW150914 split equally). */
  readonly snr: Readonly<Partial<Record<DetectorId, number>>>;
  /** Relative sensitivity of each detector at the time (BNS range ÷ L1's). */
  readonly sensitivity: Readonly<Partial<Record<DetectorId, number>>>;
  /** Right ascension and declination of the source (degrees), or null when not known. */
  readonly sky: { readonly raDeg: number; readonly decDeg: number } | null;
  /** Measured H1 − L1 arrival-time difference (s); null to use the sky position. */
  readonly measuredHMinusL: number | null;
  /** Published 90 % credible area (deg²) for comparison. */
  readonly publishedArea90: number;
};

/** August 2017 BNS ranges: H1 ≈ 60 Mpc, L1 ≈ 100 Mpc, V1 ≈ 27 Mpc. */
const SENSITIVITY_AUGUST_2017 = { H1: 0.6, L1: 1, V1: 0.27 } as const;

/**
 * H1 − L1 delay of GW150914 measured from the bundled whitened strain (peak of the
 * cross-correlation, sign-inverted because the two detectors' arms are rotated by ≈ 90°).
 * The discovery paper quotes 6.9 (+0.5 / −0.4) ms. tests/networkModel.test.ts re-measures it.
 */
/** Measured H1 − L1 lag (s); also shown on the arrival-traces caption. */
export const GW150914_MEASURED_DELAY = 7.3e-3;

export const NETWORK_PRESETS: readonly NetworkPreset[] = [
  {
    id: "GW150914",
    eventId: "GW150914",
    gps: 1126259462.4,
    detectors: ["H1", "L1"],
    snr: { H1: 17, L1: 17 },
    sensitivity: { H1: 1, L1: 1 },
    sky: null,
    measuredHMinusL: GW150914_MEASURED_DELAY,
    publishedArea90: 180,
  },
  {
    id: "GW170814",
    eventId: "GW170814",
    gps: 1186741861.5,
    detectors: ["H1", "L1", "V1"],
    snr: { H1: 7.3, L1: 13.7, V1: 4.4 },
    sensitivity: SENSITIVITY_AUGUST_2017,
    sky: { raDeg: 47.75, decDeg: -44.95 },
    measuredHMinusL: null,
    publishedArea90: 60,
  },
  {
    id: "GW170817",
    eventId: "GW170817",
    gps: 1187008882.4,
    detectors: ["H1", "L1", "V1"],
    snr: { H1: 18.8, L1: 26.4, V1: 2.0 },
    sensitivity: SENSITIVITY_AUGUST_2017,
    sky: { raDeg: 197.4487, decDeg: -23.3839 },
    measuredHMinusL: null,
    publishedArea90: 28,
  },
];
