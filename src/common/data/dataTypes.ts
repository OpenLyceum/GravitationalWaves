/**
 * dataTypes.ts
 *
 * Shapes of the bundled GWOSC event catalog and per-event whitened strain.
 * Shared by `scripts/build-data.ts` and the simulation.
 */

/** Sample rate of every bundled strain window after decimation (Hz). */
export const EVENT_SAMPLE_RATE = 2048;

/** One interferometer's whitened, band-passed, decimated strain window. */
export type DetectorStrain = {
  /** Samples per second after decimation (2048 Hz). */
  readonly sampleRate: number;
  /** Start of the window relative to the catalog merger GPS (seconds). */
  readonly startOffset: number;
  /** Multiply Int16 `samples` by this to recover dimensionless strain. */
  readonly scale: number;
  /** Quantized whitened strain (Int16 range, stored as numbers). */
  readonly samples: readonly number[];
};

/** Everything about an event except the strain time series. */
export type CatalogEvent = {
  readonly id: string;
  readonly name: string;
  readonly catalog: string;
  /** Catalog merger GPS time (s). */
  readonly gps: number;
  readonly m1Source: number;
  readonly m2Source: number;
  readonly chirpMassSource: number;
  readonly distanceMpc: number;
  readonly redshift: number;
  readonly networkSnr: number;
  readonly detectors: readonly string[];
};

/** Catalog row plus lazily loaded H1 / L1 strain. */
export type LoadedEvent = CatalogEvent & {
  readonly H1: DetectorStrain;
  readonly L1: DetectorStrain;
};

/** Per-event generated module payload. */
export type EventStrainData = {
  readonly H1: DetectorStrain;
  readonly L1: DetectorStrain;
};

/** Log-spaced ASD curve for the Interferometer overlay. */
export type LigoAsdCurve = {
  readonly f: readonly number[];
  readonly asd: readonly number[];
};
