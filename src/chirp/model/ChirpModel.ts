/**
 * ChirpModel.ts
 *
 * Screen model for the Chirp screen: inspiral waveform, whitened detector output,
 * matched filtering, and optional real-event overlays from GWOSC.
 */
import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import type { CatalogEvent, LoadedEvent } from "../../common/data/dataTypes.js";
import { catalogEvents, detectorFrameMasses, loadEvent } from "../../common/data/eventLibrary.js";
import {
  chirpMass,
  generateWaveform,
  iscoFrequency,
  ringdownFrequency,
  timeInBand,
  type Waveform,
} from "../../common/model/Chirp.js";
import { match, optimalSnr, type SnrScanResult, snrScan } from "../../common/model/MatchedFilter.js";
import { totalAsd } from "../../common/model/NoiseModel.js";
import { whiteNoise, whitenedSignal } from "../../common/model/whiten.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  CHIRP_DISTANCE_DEFAULT,
  CHIRP_DISTANCE_RANGE,
  CHIRP_F_LOW,
  CHIRP_M1_DEFAULT,
  CHIRP_M2_DEFAULT,
  CHIRP_MASS_RANGE,
  CHIRP_MAX_DURATION_S,
  CHIRP_NOISE_SEED_DEFAULT,
  CHIRP_SAMPLE_RATE,
  CHIRP_SNR_SCAN_MAX_MC,
  CHIRP_SNR_SCAN_MIN_MC,
  CHIRP_SNR_SCAN_TEMPLATES,
  CHIRP_TEMPLATE_M1_DEFAULT,
  CHIRP_TEMPLATE_M2_DEFAULT,
  ORIENTATION_FACTOR,
  STEP_DT,
  TIME_SPEED_MULTIPLIERS,
} from "../../GravitationalWavesConstants.js";

/** Source selector: custom parameters or a catalog event id. */
export type ChirpSourceId = "custom" | string;

const EMPTY_WAVEFORM: Waveform = {
  t: new Float64Array(0),
  h: new Float64Array(0),
  hQuadrature: new Float64Array(0),
  f: new Float64Array(0),
  mergerIndex: 0,
};

const EMPTY_SCAN: SnrScanResult = {
  mcTemplate: new Float64Array(0),
  snr: new Float64Array(0),
};

/** Toy detector ASD used for SNR / whitening on this screen (all terms on). */
const chirpToyAsd = (f: number): number =>
  totalAsd(f, { L: 4000, N: 300, powerRatio: 1 }, { seismic: true, thermal: true, shot: true });

export class ChirpModel implements TModel {
  public readonly timer = new TimeModel({
    initiallyPlaying: false,
    timeSpeedMultipliers: TIME_SPEED_MULTIPLIERS,
  });

  public readonly catalog: readonly CatalogEvent[] = catalogEvents();

  public readonly sourceProperty: Property<ChirpSourceId>;
  public readonly m1Property: NumberProperty;
  public readonly m2Property: NumberProperty;
  public readonly distanceProperty: NumberProperty;
  public readonly templateM1Property: NumberProperty;
  public readonly templateM2Property: NumberProperty;
  public readonly noiseSeedProperty: NumberProperty;

  public readonly showL1Property: BooleanProperty;
  public readonly showHiddenSignalProperty: BooleanProperty;
  public readonly showTemplateProperty: BooleanProperty;
  public readonly showFrequencyTrackProperty: BooleanProperty;

  /** Catalog event strain when an event source is selected and finished loading. */
  public readonly loadedEventProperty: Property<LoadedEvent | null>;
  public readonly eventLoadingProperty: BooleanProperty;

  public readonly chirpMassProperty: NumberProperty;
  public readonly timeInBandProperty: NumberProperty;
  public readonly fIscoProperty: NumberProperty;
  public readonly fRingProperty: NumberProperty;
  public readonly optimalSnrProperty: NumberProperty;
  public readonly matchProperty: NumberProperty;
  public readonly recoveredSnrProperty: NumberProperty;
  /** Catalog network SNR of the selected event; null for a custom source. */
  public readonly catalogNetworkSnrProperty: Property<number | null>;

  public readonly waveformProperty: Property<Waveform>;
  public readonly whitenedSignalProperty: Property<Float64Array>;
  public readonly noiseProperty: Property<Float64Array>;
  public readonly dataProperty: Property<Float64Array>;
  public readonly templateWhitenedProperty: Property<Float64Array>;
  public readonly snrScanProperty: Property<SnrScanResult>;

  /**
   * Playhead time on the waveform axis (seconds before merger, negative during
   * inspiral). Driven by TimeModel; wraps over the displayed window.
   */
  public readonly playheadProperty: NumberProperty;

  public readonly isDetectedProperty: TReadOnlyProperty<boolean>;

  private applyingSource = false;
  private syncingMasses = false;
  private loadGeneration = 0;
  private readonly unlinkMassGuards: () => void;
  private readonly unlinkSource: () => void;
  private readonly unlinkRecompute: () => void;
  private readonly unlinkPlayhead: () => void;
  private readonly disposeDerived: () => void;

  public constructor() {
    this.sourceProperty = new Property<ChirpSourceId>("custom");
    this.m1Property = new NumberProperty(CHIRP_M1_DEFAULT, { range: CHIRP_MASS_RANGE });
    this.m2Property = new NumberProperty(CHIRP_M2_DEFAULT, { range: CHIRP_MASS_RANGE });
    this.distanceProperty = new NumberProperty(CHIRP_DISTANCE_DEFAULT, { range: CHIRP_DISTANCE_RANGE });
    this.templateM1Property = new NumberProperty(CHIRP_TEMPLATE_M1_DEFAULT, { range: CHIRP_MASS_RANGE });
    this.templateM2Property = new NumberProperty(CHIRP_TEMPLATE_M2_DEFAULT, { range: CHIRP_MASS_RANGE });
    this.noiseSeedProperty = new NumberProperty(CHIRP_NOISE_SEED_DEFAULT);

    this.showL1Property = new BooleanProperty(false);
    this.showHiddenSignalProperty = new BooleanProperty(false);
    this.showTemplateProperty = new BooleanProperty(false);
    this.showFrequencyTrackProperty = new BooleanProperty(true);

    this.loadedEventProperty = new Property<LoadedEvent | null>(null);
    this.eventLoadingProperty = new BooleanProperty(false);

    this.chirpMassProperty = new NumberProperty(chirpMass(CHIRP_M1_DEFAULT, CHIRP_M2_DEFAULT));
    this.timeInBandProperty = new NumberProperty(0);
    this.fIscoProperty = new NumberProperty(0);
    this.fRingProperty = new NumberProperty(0);
    this.optimalSnrProperty = new NumberProperty(0);
    this.matchProperty = new NumberProperty(0);
    this.recoveredSnrProperty = new NumberProperty(0);
    this.catalogNetworkSnrProperty = new Property<number | null>(null);

    this.waveformProperty = new Property<Waveform>(EMPTY_WAVEFORM);
    const emptySamples: Float64Array = new Float64Array(0);
    this.whitenedSignalProperty = new Property<Float64Array>(emptySamples);
    this.noiseProperty = new Property<Float64Array>(emptySamples);
    this.dataProperty = new Property<Float64Array>(emptySamples);
    this.templateWhitenedProperty = new Property<Float64Array>(emptySamples);
    this.snrScanProperty = new Property<SnrScanResult>(EMPTY_SCAN);

    this.playheadProperty = new NumberProperty(0);

    this.isDetectedProperty = new DerivedProperty([this.recoveredSnrProperty], (snr) => snr >= 8);

    // Enforce m2 ≤ m1 (signal and template). Lowering m1 below m2 pulls m2 down; raising m2 above
    // m1 pushes m1 up. Each listener only writes the *other* Property, so there is no reentrant set.
    const onM1 = (m1: number) => {
      if (this.syncingMasses) {
        return;
      }
      this.syncingMasses = true;
      if (this.m2Property.value > m1) {
        this.m2Property.value = m1;
      }
      this.syncingMasses = false;
      this.markCustomIfUserEdit();
    };
    const onM2 = (m2: number) => {
      if (this.syncingMasses) {
        return;
      }
      this.syncingMasses = true;
      if (m2 > this.m1Property.value) {
        this.m1Property.value = m2;
      }
      this.syncingMasses = false;
      this.markCustomIfUserEdit();
    };
    const onTemplateM1 = (m1: number) => {
      if (this.syncingMasses) {
        return;
      }
      this.syncingMasses = true;
      if (this.templateM2Property.value > m1) {
        this.templateM2Property.value = m1;
      }
      this.syncingMasses = false;
    };
    const onTemplateM2 = (m2: number) => {
      if (this.syncingMasses) {
        return;
      }
      this.syncingMasses = true;
      if (m2 > this.templateM1Property.value) {
        this.templateM1Property.value = m2;
      }
      this.syncingMasses = false;
    };
    const onDistance = () => this.markCustomIfUserEdit();
    this.m1Property.lazyLink(onM1);
    this.m2Property.lazyLink(onM2);
    this.templateM1Property.lazyLink(onTemplateM1);
    this.templateM2Property.lazyLink(onTemplateM2);
    this.distanceProperty.lazyLink(onDistance);
    this.unlinkMassGuards = () => {
      this.m1Property.unlink(onM1);
      this.m2Property.unlink(onM2);
      this.templateM1Property.unlink(onTemplateM1);
      this.templateM2Property.unlink(onTemplateM2);
      this.distanceProperty.unlink(onDistance);
    };

    const onSource = (id: ChirpSourceId) => this.applySource(id);
    this.sourceProperty.lazyLink(onSource);
    this.unlinkSource = () => this.sourceProperty.unlink(onSource);

    const recompute = () => this.recompute();
    this.m1Property.link(recompute);
    this.m2Property.link(recompute);
    this.distanceProperty.link(recompute);
    this.templateM1Property.link(recompute);
    this.templateM2Property.link(recompute);
    this.noiseSeedProperty.link(recompute);
    this.unlinkRecompute = () => {
      this.m1Property.unlink(recompute);
      this.m2Property.unlink(recompute);
      this.distanceProperty.unlink(recompute);
      this.templateM1Property.unlink(recompute);
      this.templateM2Property.unlink(recompute);
      this.noiseSeedProperty.unlink(recompute);
    };

    const updatePlayhead = () => this.updatePlayhead();
    this.timer.timeProperty.link(updatePlayhead);
    this.waveformProperty.link(updatePlayhead);
    this.unlinkPlayhead = () => {
      this.timer.timeProperty.unlink(updatePlayhead);
      this.waveformProperty.unlink(updatePlayhead);
    };

    this.disposeDerived = () => {
      this.isDetectedProperty.dispose();
    };
  }

  /** Scale an optimal-orientation strain array by the sky-average factor. */
  public applyOrientation(h: Float64Array): Float64Array {
    const out = new Float64Array(h.length);
    for (let i = 0; i < h.length; i++) {
      out[i] = (h[i] ?? 0) * ORIENTATION_FACTOR;
    }
    return out;
  }

  public newNoise(): void {
    this.noiseSeedProperty.value = (this.noiseSeedProperty.value + 1) >>> 0;
  }

  /** On-demand SNR-vs-ℳ′ scan (log grid). Orientation factor already in ρ_opt. */
  public scanTemplates(): void {
    const m1 = this.m1Property.value;
    const m2 = this.m2Property.value;
    const distance = this.distanceProperty.value;
    const mc = chirpMass(m1, m2);
    const raw = snrScan(
      mc,
      m1 + m2,
      distance,
      chirpToyAsd,
      CHIRP_SNR_SCAN_MIN_MC,
      CHIRP_SNR_SCAN_MAX_MC,
      CHIRP_SNR_SCAN_TEMPLATES,
      CHIRP_F_LOW,
    );
    const snr = new Float64Array(raw.snr.length);
    for (let i = 0; i < snr.length; i++) {
      snr[i] = (raw.snr[i] ?? 0) * ORIENTATION_FACTOR;
    }
    this.snrScanProperty.value = { mcTemplate: raw.mcTemplate, snr };
  }

  public stepOnce(dt: number = STEP_DT): void {
    this.timer.advance(dt * this.timer.speedMultiplier);
  }

  public reset(): void {
    this.applyingSource = true;
    this.loadGeneration += 1;
    this.timer.reset();
    this.sourceProperty.reset();
    this.m1Property.reset();
    this.m2Property.reset();
    this.distanceProperty.reset();
    this.templateM1Property.reset();
    this.templateM2Property.reset();
    this.noiseSeedProperty.reset();
    this.showL1Property.reset();
    this.showHiddenSignalProperty.reset();
    this.showTemplateProperty.reset();
    this.showFrequencyTrackProperty.reset();
    this.loadedEventProperty.value = null;
    this.eventLoadingProperty.value = false;
    this.catalogNetworkSnrProperty.value = null;
    this.snrScanProperty.value = EMPTY_SCAN;
    this.applyingSource = false;
    this.recompute();
  }

  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.timer.step(dt);
  }

  public dispose(): void {
    this.unlinkMassGuards();
    this.unlinkSource();
    this.unlinkRecompute();
    this.unlinkPlayhead();
    this.disposeDerived();
    this.sourceProperty.dispose();
    this.m1Property.dispose();
    this.m2Property.dispose();
    this.distanceProperty.dispose();
    this.templateM1Property.dispose();
    this.templateM2Property.dispose();
    this.noiseSeedProperty.dispose();
    this.showL1Property.dispose();
    this.showHiddenSignalProperty.dispose();
    this.showTemplateProperty.dispose();
    this.showFrequencyTrackProperty.dispose();
    this.loadedEventProperty.dispose();
    this.eventLoadingProperty.dispose();
    this.chirpMassProperty.dispose();
    this.timeInBandProperty.dispose();
    this.fIscoProperty.dispose();
    this.fRingProperty.dispose();
    this.optimalSnrProperty.dispose();
    this.matchProperty.dispose();
    this.recoveredSnrProperty.dispose();
    this.catalogNetworkSnrProperty.dispose();
    this.waveformProperty.dispose();
    this.whitenedSignalProperty.dispose();
    this.noiseProperty.dispose();
    this.dataProperty.dispose();
    this.templateWhitenedProperty.dispose();
    this.snrScanProperty.dispose();
    this.playheadProperty.dispose();
    this.timer.dispose();
  }

  /** Recompute derived quantities (call after slider edits; not every frame). */
  public recompute(): void {
    const m1 = this.m1Property.value;
    const m2 = this.m2Property.value;
    const distance = this.distanceProperty.value;
    const mc = chirpMass(m1, m2);
    const total = m1 + m2;
    const tauBand = timeInBand(CHIRP_F_LOW, mc);
    const duration = Math.min(tauBand, CHIRP_MAX_DURATION_S);
    const fIsco = iscoFrequency(total);
    const fRing = total >= 5 ? ringdownFrequency(0.95 * total) : fIsco;

    const raw = generateWaveform({
      m1,
      m2,
      distanceMpc: distance,
      sampleRate: CHIRP_SAMPLE_RATE,
      duration,
    });
    const hOriented = this.applyOrientation(raw.h);
    const waveform: Waveform = { ...raw, h: hOriented, hQuadrature: this.applyOrientation(raw.hQuadrature) };

    const whitened = whitenedSignal(waveform.h, waveform.f, chirpToyAsd, CHIRP_SAMPLE_RATE, fRing);
    const noise = whiteNoise(whitened.length, this.noiseSeedProperty.value >>> 0);
    const data = new Float64Array(whitened.length);
    for (let i = 0; i < whitened.length; i++) {
      data[i] = (whitened[i] ?? 0) + (noise[i] ?? 0);
    }

    const tM1 = this.templateM1Property.value;
    const tM2 = Math.min(this.templateM2Property.value, tM1);
    const tMc = chirpMass(tM1, tM2);
    const tTotal = tM1 + tM2;
    const tDuration = Math.min(timeInBand(CHIRP_F_LOW, tMc), CHIRP_MAX_DURATION_S);
    const tRaw = generateWaveform({
      m1: tM1,
      m2: tM2,
      distanceMpc: distance,
      sampleRate: CHIRP_SAMPLE_RATE,
      duration: tDuration,
    });
    const tOriented = this.applyOrientation(tRaw.h);
    const tFRing = tTotal >= 5 ? ringdownFrequency(0.95 * tTotal) : iscoFrequency(tTotal);
    const templateWhitened = whitenedSignal(tOriented, tRaw.f, chirpToyAsd, CHIRP_SAMPLE_RATE, tFRing);

    const rhoOpt = ORIENTATION_FACTOR * optimalSnr(mc, total, distance, chirpToyAsd, CHIRP_F_LOW);
    const matchValue = match(mc, tMc, fIsco, iscoFrequency(tTotal), chirpToyAsd, CHIRP_F_LOW);
    const recovered = rhoOpt * matchValue;

    this.chirpMassProperty.value = mc;
    this.timeInBandProperty.value = tauBand;
    this.fIscoProperty.value = fIsco;
    this.fRingProperty.value = fRing;
    this.optimalSnrProperty.value = rhoOpt;
    this.matchProperty.value = matchValue;
    this.recoveredSnrProperty.value = recovered;
    this.waveformProperty.value = waveform;
    this.whitenedSignalProperty.value = whitened;
    this.noiseProperty.value = noise;
    this.dataProperty.value = data;
    this.templateWhitenedProperty.value = templateWhitened;
  }

  private markCustomIfUserEdit(): void {
    if (this.applyingSource) {
      return;
    }
    if (this.sourceProperty.value !== "custom") {
      this.sourceProperty.value = "custom";
      this.loadedEventProperty.value = null;
      this.catalogNetworkSnrProperty.value = null;
    }
  }

  private applySource(id: ChirpSourceId): void {
    if (id === "custom") {
      this.loadGeneration += 1;
      this.eventLoadingProperty.value = false;
      this.loadedEventProperty.value = null;
      this.catalogNetworkSnrProperty.value = null;
      return;
    }
    const event = this.catalog.find((e) => e.id === id);
    if (!event) {
      return;
    }
    this.applyingSource = true;
    const masses = detectorFrameMasses(event);
    this.m1Property.value = Math.min(CHIRP_MASS_RANGE.max, Math.max(CHIRP_MASS_RANGE.min, masses.m1));
    this.m2Property.value = Math.min(this.m1Property.value, Math.max(CHIRP_MASS_RANGE.min, masses.m2));
    this.distanceProperty.value = Math.min(
      CHIRP_DISTANCE_RANGE.max,
      Math.max(CHIRP_DISTANCE_RANGE.min, event.distanceMpc),
    );
    this.catalogNetworkSnrProperty.value = event.networkSnr;
    this.applyingSource = false;

    const generation = ++this.loadGeneration;
    this.eventLoadingProperty.value = true;
    loadEvent(id).then(
      (loaded) => {
        if (generation !== this.loadGeneration || this.sourceProperty.value !== id) {
          return;
        }
        this.loadedEventProperty.value = loaded;
        this.eventLoadingProperty.value = false;
      },
      () => {
        if (generation !== this.loadGeneration) {
          return;
        }
        this.loadedEventProperty.value = null;
        this.eventLoadingProperty.value = false;
      },
    );
  }

  private updatePlayhead(): void {
    const waveform = this.waveformProperty.value;
    if (waveform.t.length < 2) {
      this.playheadProperty.value = 0;
      return;
    }
    const t0 = waveform.t[0] ?? 0;
    const t1 = waveform.t[waveform.t.length - 1] ?? 0;
    const span = t1 - t0;
    if (!(span > 0)) {
      this.playheadProperty.value = t0;
      return;
    }
    const elapsed = this.timer.timeProperty.value;
    const phase = ((elapsed % span) + span) % span;
    this.playheadProperty.value = t0 + phase;
  }
}
