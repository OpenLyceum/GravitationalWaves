/**
 * scripts/data/buildEvent.ts
 *
 * Download one GWOSC 32 s / 4 kHz txt.gz strain pair, whiten, band-pass, window,
 * decimate to 2048 Hz, and quantize to Int16.
 */

import { gunzipSync } from "node:zlib";
import type { DetectorStrain, EventStrainData } from "../../src/common/data/dataTypes.js";
import { bandPass, decimate, quantizeInt16, welchAsd, whiten } from "./dsp.js";
import { fetchBinary } from "./fetchCache.js";

export type EventSpec = {
  readonly id: string;
  readonly name: string;
  readonly catalog: string;
  readonly gps: number;
  readonly m1Source: number;
  readonly m2Source: number;
  readonly chirpMassSource: number;
  readonly distanceMpc: number;
  readonly redshift: number;
  readonly networkSnr: number;
  readonly h1Url: string;
  readonly bandLowHz: number;
};

const SAMPLE_RATE = 4096;
const TARGET_RATE = 2048;
const WINDOW_SECONDS = 1.5;
const POST_MERGER_DEFAULT = 0.1;
const POST_MERGER_WIDE = 0.2;
const BAND_HIGH_HZ = 350;

/** Parse GPS start time from a GWOSC filename …-START-DURATION.txt.gz */
export function parseStartGps(url: string): number {
  const match = /R1-(\d+)-\d+\.txt\.gz$/.exec(url);
  if (!match) {
    throw new Error(`Cannot parse start GPS from ${url}`);
  }
  return Number(match[1]);
}

/** L1 URL is the H1 URL with H-H1_ → L-L1_. */
export function l1UrlFromH1(h1Url: string): string {
  return h1Url.replace("H-H1_", "L-L1_");
}

/** Gunzip and parse a GWOSC plain-text strain file (one value per line after # comments). */
export function parseStrainTxt(bytes: Buffer): Float64Array {
  const text = gunzipSync(bytes).toString("utf8");
  const values: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const value = Number(line.trim());
    if (Number.isFinite(value)) {
      values.push(value);
    }
  }
  if (values.length === 0) {
    throw new Error("Empty strain file");
  }
  return Float64Array.from(values);
}

/** Peak of |series| near merger, as seconds relative to merger GPS. */
function peakOffsetNearMerger(series: Float64Array, startGps: number, mergerGps: number, searchHalfWidth = 2): number {
  const iCenter = Math.round((mergerGps - startGps) * SAMPLE_RATE);
  const i0 = Math.max(0, iCenter - Math.round(searchHalfWidth * SAMPLE_RATE));
  const i1 = Math.min(series.length, iCenter + Math.round(searchHalfWidth * SAMPLE_RATE));
  let peakIndex = iCenter;
  let peakAbs = 0;
  for (let i = i0; i < i1; i++) {
    const a = Math.abs(series[i]!);
    if (a > peakAbs) {
      peakAbs = a;
      peakIndex = i;
    }
  }
  return startGps + peakIndex / SAMPLE_RATE - mergerGps;
}

function processDetector(
  series: Float64Array,
  startGps: number,
  mergerGps: number,
  postMerger: number,
): { strain: DetectorStrain; peakOffset: number } {
  const peakOffset = peakOffsetNearMerger(series, startGps, mergerGps);
  const windowEnd = mergerGps + postMerger;
  const windowStart = windowEnd - WINDOW_SECONDS;
  const i0 = Math.round((windowStart - startGps) * SAMPLE_RATE);
  const i1 = Math.round((windowEnd - startGps) * SAMPLE_RATE);
  if (i0 < 0 || i1 > series.length) {
    throw new Error(`Window [${windowStart}, ${windowEnd}] outside strain span starting at GPS ${startGps}`);
  }
  const windowed = series.subarray(i0, i1);
  const expected = Math.round(WINDOW_SECONDS * SAMPLE_RATE);
  if (windowed.length !== expected) {
    throw new Error(`Expected ${expected} samples in window, got ${windowed.length}`);
  }
  const decimated = decimate(windowed, SAMPLE_RATE / TARGET_RATE);
  const { scale, samples } = quantizeInt16(decimated);
  const startOffset = windowStart - mergerGps;

  return {
    strain: {
      sampleRate: TARGET_RATE,
      startOffset,
      scale,
      samples,
    },
    peakOffset,
  };
}

function condition(
  raw: Float64Array,
  bandLowHz: number,
): { series: Float64Array; welch: { f: Float64Array; asd: Float64Array } } {
  const welch = welchAsd(raw, SAMPLE_RATE, 4);
  let series = whiten(raw, SAMPLE_RATE, welch.f, welch.asd, 0.1);
  series = bandPass(series, SAMPLE_RATE, bandLowHz, BAND_HIGH_HZ, 5);
  return { series, welch };
}

export type BuiltEvent = {
  readonly spec: EventSpec;
  readonly data: EventStrainData;
  readonly postMerger: number;
  readonly h1PeakOffset: number;
  readonly l1PeakOffset: number;
  /** Welch ASD of the raw H1 series (before whitening), for GW150914 overlay. */
  readonly h1Welch: { f: Float64Array; asd: Float64Array } | null;
};

/**
 * Download and condition H1 + L1 for one event. Widens the post-merger pad to
 * 0.2 s if the H1 whitened peak falls outside the default 1.5 s window.
 */
export async function buildEvent(spec: EventSpec): Promise<BuiltEvent> {
  const h1Url = spec.h1Url;
  const l1Url = l1UrlFromH1(h1Url);
  const startGps = parseStartGps(h1Url);

  const [h1Bytes, l1Bytes] = await Promise.all([
    fetchBinary(h1Url, `${spec.id}-H1.txt.gz`),
    fetchBinary(l1Url, `${spec.id}-L1.txt.gz`),
  ]);
  const h1Raw = parseStrainTxt(h1Bytes);
  const l1Raw = parseStrainTxt(l1Bytes);
  if (h1Raw.length !== SAMPLE_RATE * 32 || l1Raw.length !== SAMPLE_RATE * 32) {
    console.warn(
      `  ${spec.id}: unexpected lengths H1=${h1Raw.length} L1=${l1Raw.length} (expected ${SAMPLE_RATE * 32})`,
    );
  }

  // Pad to next power of two if needed (GWOSC 32 s @ 4 kHz is already 2^17).
  const ensurePow2 = (arr: Float64Array): Float64Array => {
    let n = 1;
    while (n < arr.length) {
      n <<= 1;
    }
    if (n === arr.length) {
      return arr;
    }
    const padded = new Float64Array(n);
    padded.set(arr);
    return padded;
  };

  const h1 = ensurePow2(h1Raw);
  const l1 = ensurePow2(l1Raw);
  const h1Cond = condition(h1, spec.bandLowHz);
  const l1Cond = condition(l1, spec.bandLowHz);

  let postMerger = POST_MERGER_DEFAULT;
  const h1PeakProbe = peakOffsetNearMerger(h1Cond.series, startGps, spec.gps);
  const windowStart0 = postMerger - WINDOW_SECONDS;
  if (h1PeakProbe < windowStart0 || h1PeakProbe > postMerger) {
    console.warn(
      `  ${spec.id}: H1 peak at t=${h1PeakProbe.toFixed(3)} s relative to GPS — widening window to +${POST_MERGER_WIDE} s`,
    );
    postMerger = POST_MERGER_WIDE;
  }

  const h1Result = processDetector(h1Cond.series, startGps, spec.gps, postMerger);
  const l1Result = processDetector(l1Cond.series, startGps, spec.gps, postMerger);

  return {
    spec,
    data: { H1: h1Result.strain, L1: l1Result.strain },
    postMerger,
    h1PeakOffset: h1Result.peakOffset,
    l1PeakOffset: l1Result.peakOffset,
    h1Welch: spec.id === "GW150914" ? h1Cond.welch : null,
  };
}
