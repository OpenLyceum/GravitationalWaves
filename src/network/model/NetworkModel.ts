/**
 * NetworkModel.ts
 *
 * Screen model for the Network screen: a source somewhere on the sky, a network of up to
 * four detectors, the arrival-time differences and responses they measure, and the sky
 * map those measurements allow (see doc/model.md, "Screen 4 — Network").
 *
 * Sky positions are Earth-fixed: (longitude, latitude) of the point directly beneath the
 * source, in degrees.
 */

import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { Bounds2, roundSymmetric, Vector2, Vector2Property } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { catalogEvents, detectorFrameMasses } from "../../common/data/eventLibrary.js";
import { generateWaveform } from "../../common/model/Chirp.js";
import {
  arrivalDelay,
  circularResponse,
  DETECTOR_IDS,
  DETECTOR_SITES,
  type DetectorGeometry,
  type DetectorId,
  detectorGeometry,
  lightTravelTime,
  subSourceLongitude,
} from "../../common/model/DetectorNetwork.js";
import {
  angularSeparation,
  type DetectorObservation,
  FULL_SKY_DEG2,
  localize,
  type SkyMap,
  timingError,
} from "../../common/model/SkyLocalization.js";
import { whiteNoise } from "../../common/model/whiten.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  NETWORK_NOISE_SEED_DEFAULT,
  NETWORK_SLOW_MOTION,
  NETWORK_SNR_DEFAULT,
  NETWORK_SNR_RANGE,
  NETWORK_SOURCE_LAT_DEFAULT,
  NETWORK_SOURCE_LON_DEFAULT,
  NETWORK_TRACE_END_S,
  NETWORK_TRACE_M1,
  NETWORK_TRACE_M2,
  NETWORK_TRACE_SAMPLE_RATE,
  NETWORK_TRACE_START_S,
  STEP_DT,
  TIME_SPEED_MULTIPLIERS,
} from "../../GravitationalWavesConstants.js";
import { NETWORK_PRESETS, type NetworkPreset, type NetworkPresetId } from "./networkPresets.js";

export type NetworkSourceId = "custom" | NetworkPresetId;

/** What one enabled detector measured, for readouts and traces. */
export type DetectorReading = {
  readonly id: DetectorId;
  /** Observed arrival time relative to the Earth's centre (s), including measurement noise. */
  readonly arrival: number;
  /** Response √(F₊² + F×²) at the true position (null when the true position is unknown). */
  readonly response: number | null;
  /** Observed SNR. */
  readonly snr: number;
  /** 1σ timing error (s). */
  readonly timingError: number;
  /** Relative sensitivity used for this detector. */
  readonly sensitivity: number;
};

/** Observed delay between two detectors: the ring of directions it allows. */
export type DetectorPair = {
  readonly a: DetectorId;
  readonly b: DetectorId;
  /** Observed t_a − t_b (s). */
  readonly delay: number;
  /** Light-travel time between the sites (s). */
  readonly lightTravelTime: number;
};

/** Sky position bounds (degrees): longitude −180..180, latitude −90..90. */
export const SKY_BOUNDS = new Bounds2(-180, -90, 180, 90);

const GEOMETRY: Readonly<Record<DetectorId, DetectorGeometry>> = {
  H1: detectorGeometry(DETECTOR_SITES.H1),
  L1: detectorGeometry(DETECTOR_SITES.L1),
  V1: detectorGeometry(DETECTOR_SITES.V1),
  K1: detectorGeometry(DETECTOR_SITES.K1),
};

const DEG = Math.PI / 180;

const EMPTY_MAP: SkyMap = {
  density: new Float64Array(0),
  area90: FULL_SKY_DEG2,
  area50: FULL_SKY_DEG2 / 2,
  threshold90: 0,
  peakLon: 0,
  peakLat: 0,
};

/** Geometry of a detector (shared, immutable). */
export function networkDetector(id: DetectorId): DetectorGeometry {
  return GEOMETRY[id];
}

export class NetworkModel implements TModel {
  public readonly timer = new TimeModel({
    initiallyPlaying: false,
    timeSpeedMultipliers: TIME_SPEED_MULTIPLIERS,
  });

  public readonly presets: readonly NetworkPreset[] = NETWORK_PRESETS;

  public readonly sourceProperty: Property<NetworkSourceId>;
  /** True source position (lon, lat in degrees). Ignored while a preset has no known position. */
  public readonly sourcePositionProperty: Vector2Property;
  public readonly detectorEnabledProperties: Readonly<Record<DetectorId, BooleanProperty>>;
  public readonly networkSnrProperty: NumberProperty;
  public readonly measurementNoiseProperty: BooleanProperty;
  public readonly noiseSeedProperty: NumberProperty;
  public readonly showRingsProperty: BooleanProperty;
  public readonly showTruthProperty: BooleanProperty;

  /** False for a preset whose true position is not known (GW150914). */
  public readonly truthKnownProperty: BooleanProperty;
  public readonly readingsProperty: Property<readonly DetectorReading[]>;
  public readonly pairsProperty: Property<readonly DetectorPair[]>;
  public readonly skyMapProperty: Property<SkyMap>;
  /** Angle between the true position and the most probable direction (degrees); null if unknown. */
  public readonly pointingErrorProperty: Property<number | null>;
  /** Published 90 % area for the selected preset (deg²); null for a custom source. */
  public readonly publishedAreaProperty: Property<number | null>;

  /** Trace time axis (s, relative to geocentre merger) and one normalized trace per reading. */
  public readonly traceTimes: Float64Array;
  public readonly tracesProperty: Property<ReadonlyMap<DetectorId, Float64Array>>;

  /** Playhead on the trace axis (s), driven by the timer in slow motion. */
  public readonly playheadProperty: NumberProperty;

  private applyingSource = false;
  private readonly unlinkAll: () => void;

  public constructor() {
    this.sourceProperty = new Property<NetworkSourceId>("custom");
    this.sourcePositionProperty = new Vector2Property(
      new Vector2(NETWORK_SOURCE_LON_DEFAULT, NETWORK_SOURCE_LAT_DEFAULT),
      { validBounds: SKY_BOUNDS },
    );
    this.detectorEnabledProperties = {
      H1: new BooleanProperty(true),
      L1: new BooleanProperty(true),
      V1: new BooleanProperty(false),
      K1: new BooleanProperty(false),
    };
    this.networkSnrProperty = new NumberProperty(NETWORK_SNR_DEFAULT, { range: NETWORK_SNR_RANGE });
    this.measurementNoiseProperty = new BooleanProperty(true);
    this.noiseSeedProperty = new NumberProperty(NETWORK_NOISE_SEED_DEFAULT);
    this.showRingsProperty = new BooleanProperty(true);
    this.showTruthProperty = new BooleanProperty(true);

    this.truthKnownProperty = new BooleanProperty(true);
    this.readingsProperty = new Property<readonly DetectorReading[]>([]);
    this.pairsProperty = new Property<readonly DetectorPair[]>([]);
    this.skyMapProperty = new Property<SkyMap>(EMPTY_MAP);
    this.pointingErrorProperty = new Property<number | null>(null);
    this.publishedAreaProperty = new Property<number | null>(null);

    const traceLength = roundSymmetric((NETWORK_TRACE_END_S - NETWORK_TRACE_START_S) * NETWORK_TRACE_SAMPLE_RATE);
    this.traceTimes = Float64Array.from(
      { length: traceLength },
      (_, i) => NETWORK_TRACE_START_S + i / NETWORK_TRACE_SAMPLE_RATE,
    );
    this.tracesProperty = new Property<ReadonlyMap<DetectorId, Float64Array>>(new Map());
    this.playheadProperty = new NumberProperty(NETWORK_TRACE_START_S);

    const onSource = (id: NetworkSourceId) => this.applySource(id);
    this.sourceProperty.lazyLink(onSource);

    // Any edit of the source or the network while a preset is shown returns to "custom".
    const onUserEdit = () => this.markCustom();
    const editable = [
      this.sourcePositionProperty,
      this.networkSnrProperty,
      ...DETECTOR_IDS.map((id) => this.detectorEnabledProperties[id]),
    ];
    for (const property of editable) {
      property.lazyLink(onUserEdit);
    }

    const recompute = () => this.recompute();
    const inputs = [
      this.sourcePositionProperty,
      this.networkSnrProperty,
      this.measurementNoiseProperty,
      this.noiseSeedProperty,
      ...DETECTOR_IDS.map((id) => this.detectorEnabledProperties[id]),
    ];
    for (const property of inputs) {
      property.lazyLink(recompute);
    }

    const updatePlayhead = (time: number) => {
      const span = NETWORK_TRACE_END_S - NETWORK_TRACE_START_S;
      const elapsed = (time / NETWORK_SLOW_MOTION) % span;
      this.playheadProperty.value = NETWORK_TRACE_START_S + elapsed;
    };
    this.timer.timeProperty.link(updatePlayhead);

    this.unlinkAll = () => {
      this.sourceProperty.unlink(onSource);
      for (const property of editable) {
        property.unlink(onUserEdit);
      }
      for (const property of inputs) {
        property.unlink(recompute);
      }
      this.timer.timeProperty.unlink(updatePlayhead);
    };

    this.recompute();
  }

  /** The selected preset, or null for a custom source. */
  public get preset(): NetworkPreset | null {
    const id = this.sourceProperty.value;
    return this.presets.find((preset) => preset.id === id) ?? null;
  }

  /** Enabled detector ids in display order. */
  public enabledDetectors(): DetectorId[] {
    return DETECTOR_IDS.filter((id) => this.detectorEnabledProperties[id].value);
  }

  public newNoise(): void {
    this.noiseSeedProperty.value = (this.noiseSeedProperty.value + 1) >>> 0;
  }

  public stepOnce(dt: number = STEP_DT): void {
    this.timer.advance(dt * this.timer.speedMultiplier);
  }

  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.timer.step(dt);
  }

  public reset(): void {
    this.applyingSource = true;
    this.timer.reset();
    this.sourceProperty.reset();
    this.sourcePositionProperty.reset();
    for (const id of DETECTOR_IDS) {
      this.detectorEnabledProperties[id].reset();
    }
    this.networkSnrProperty.reset();
    this.measurementNoiseProperty.reset();
    this.noiseSeedProperty.reset();
    this.showRingsProperty.reset();
    this.showTruthProperty.reset();
    this.applyingSource = false;
    this.recompute();
  }

  public dispose(): void {
    this.unlinkAll();
    this.sourceProperty.dispose();
    this.sourcePositionProperty.dispose();
    for (const id of DETECTOR_IDS) {
      this.detectorEnabledProperties[id].dispose();
    }
    this.networkSnrProperty.dispose();
    this.measurementNoiseProperty.dispose();
    this.noiseSeedProperty.dispose();
    this.showRingsProperty.dispose();
    this.showTruthProperty.dispose();
    this.truthKnownProperty.dispose();
    this.readingsProperty.dispose();
    this.pairsProperty.dispose();
    this.skyMapProperty.dispose();
    this.pointingErrorProperty.dispose();
    this.publishedAreaProperty.dispose();
    this.tracesProperty.dispose();
    this.playheadProperty.dispose();
    this.timer.dispose();
  }

  private markCustom(): void {
    if (!this.applyingSource && this.sourceProperty.value !== "custom") {
      this.applyingSource = true;
      this.sourceProperty.value = "custom";
      this.applyingSource = false;
    }
  }

  private applySource(id: NetworkSourceId): void {
    if (this.applyingSource) {
      return;
    }
    const preset = this.presets.find((candidate) => candidate.id === id);
    if (preset) {
      this.applyingSource = true;
      for (const detector of DETECTOR_IDS) {
        this.detectorEnabledProperties[detector].value = preset.detectors.includes(detector);
      }
      if (preset.sky) {
        const lon = subSourceLongitude(preset.sky.raDeg * DEG, preset.gps) / DEG;
        this.sourcePositionProperty.value = new Vector2(lon, preset.sky.decDeg);
      }
      this.applyingSource = false;
    }
    this.recompute();
  }

  /** Recompute readings, rings, sky map and traces (after an edit; not every frame). */
  public recompute(): void {
    const preset = this.preset;
    const truthKnown = preset === null || preset.sky !== null;
    const lon = this.sourcePositionProperty.value.x * DEG;
    const lat = this.sourcePositionProperty.value.y * DEG;
    const ids = this.enabledDetectors();
    const noisy = preset === null && this.measurementNoiseProperty.value;
    const noise = whiteNoise(2 * DETECTOR_IDS.length, this.noiseSeedProperty.value >>> 0);

    const responses = ids.map((id) => circularResponse(GEOMETRY[id], lon, lat));
    const networkResponse = Math.hypot(...responses.map((r) => r.amplitude));

    const readings: DetectorReading[] = ids.map((id, i) => {
      const response = responses[i] ?? { amplitude: 0, phase: 0 };
      const slot = DETECTOR_IDS.indexOf(id);
      let snr: number;
      let sensitivity = 1;
      if (preset) {
        snr = preset.snr[id] ?? 0;
        sensitivity = preset.sensitivity[id] ?? 1;
      } else {
        // Equal-sensitivity network: each detector's share of the network SNR follows its response.
        const share = networkResponse > 0 ? response.amplitude / networkResponse : 1 / Math.sqrt(ids.length);
        snr = this.networkSnrProperty.value * share;
        if (noisy) {
          snr = Math.max(0, snr + (noise[2 * slot + 1] ?? 0));
        }
      }
      const sigma = timingError(snr);
      let arrival = arrivalDelay(GEOMETRY[id], lon, lat);
      const measured = preset?.measuredHMinusL ?? null;
      if (measured !== null) {
        // GW150914: only the measured H1 − L1 difference is known; centre it on the geocentre.
        arrival = id === "H1" ? measured / 2 : -measured / 2;
      } else if (noisy) {
        arrival += sigma * (noise[2 * slot] ?? 0);
      }
      return {
        id,
        arrival,
        response: truthKnown ? response.amplitude : null,
        snr,
        timingError: sigma,
        sensitivity,
      };
    });

    const pairs: DetectorPair[] = [];
    readings.forEach((a, i) => {
      for (const b of readings.slice(i + 1)) {
        pairs.push({
          a: a.id,
          b: b.id,
          delay: a.arrival - b.arrival,
          lightTravelTime: lightTravelTime(GEOMETRY[a.id], GEOMETRY[b.id]),
        });
      }
    });

    const observations: DetectorObservation[] = readings.map((reading) => ({
      detector: GEOMETRY[reading.id],
      time: reading.arrival,
      snr: reading.snr,
      sensitivity: reading.sensitivity,
    }));
    const map = readings.length > 0 ? localize(observations) : EMPTY_MAP;

    this.truthKnownProperty.value = truthKnown;
    this.readingsProperty.value = readings;
    this.pairsProperty.value = pairs;
    this.skyMapProperty.value = map;
    this.pointingErrorProperty.value =
      truthKnown && readings.length > 0 ? angularSeparation(lon, lat, map.peakLon, map.peakLat) / DEG : null;
    this.publishedAreaProperty.value = preset ? preset.publishedArea90 : null;
    // Without a known position, draw the traces for the most probable direction.
    const traceLon = truthKnown ? lon : map.peakLon;
    const traceLat = truthKnown ? lat : map.peakLat;
    this.tracesProperty.value = this.computeTraces(readings, preset, traceLon, traceLat);
  }

  /**
   * Model chirp as each detector records it: shifted by the arrival time, scaled by the
   * response × sensitivity, and phase-shifted by atan2(F×, F₊). Normalized so the loudest
   * detector peaks at 1.
   */
  private computeTraces(
    readings: readonly DetectorReading[],
    preset: NetworkPreset | null,
    lon: number,
    lat: number,
  ): ReadonlyMap<DetectorId, Float64Array> {
    let m1 = NETWORK_TRACE_M1;
    let m2 = NETWORK_TRACE_M2;
    if (preset) {
      const event = catalogEvents().find((candidate) => candidate.id === preset.eventId);
      if (event) {
        ({ m1, m2 } = detectorFrameMasses(event));
      }
    }
    const fs = NETWORK_TRACE_SAMPLE_RATE;
    const waveform = generateWaveform({ m1, m2, distanceMpc: 1, sampleRate: fs, duration: 0.2 });
    let peak = 0;
    for (const value of waveform.h) {
      peak = Math.max(peak, Math.abs(value));
    }
    const t0 = waveform.t[0] ?? 0;
    const sampleAt = (array: Float64Array, t: number): number => {
      const x = (t - t0) * fs;
      const i = Math.floor(x);
      if (i < 0 || i + 1 >= array.length) {
        return 0;
      }
      const frac = x - i;
      return (array[i] ?? 0) * (1 - frac) + (array[i + 1] ?? 0) * frac;
    };

    const drawn = readings.map((reading) => ({
      reading,
      response: circularResponse(GEOMETRY[reading.id], lon, lat),
    }));
    const maxGain = Math.max(1e-9, ...drawn.map(({ reading, response }) => response.amplitude * reading.sensitivity));
    const traces = new Map<DetectorId, Float64Array>();
    for (const { reading, response } of drawn) {
      const gain = (response.amplitude * reading.sensitivity) / maxGain / (peak || 1);
      const cos = Math.cos(response.phase);
      const sin = Math.sin(response.phase);
      const trace = new Float64Array(this.traceTimes.length);
      for (let i = 0; i < trace.length; i++) {
        const t = (this.traceTimes[i] ?? 0) - reading.arrival;
        trace[i] = gain * (cos * sampleAt(waveform.h, t) + sin * sampleAt(waveform.hQuadrature, t));
      }
      traces.set(reading.id, trace);
    }
    return traces;
  }
}
