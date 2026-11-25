/**
 * InterferometerModel.ts
 *
 * Screen model for the Interferometer screen: Michelson response, antenna pattern,
 * toy noise ASD, and a scrolling output-power history.
 */
import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { LIGO_H1_ASD } from "../../common/data/generated/ligoAsd.js";
import { antennaPattern } from "../../common/model/AntennaPattern.js";
import {
  armLengths,
  DC_OFFSET_PHASE,
  FABRY_PEROT_GAIN,
  outputPower,
  phaseDifference,
} from "../../common/model/Interferometer.js";
import { logFrequencyGrid, seismicAsd, shotAsd, thermalAsd, totalAsd } from "../../common/model/NoiseModel.js";
import { RingBuffer } from "../../common/model/RingBuffer.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  ARM_LENGTH_KM_DEFAULT,
  ARM_LENGTH_KM_RANGE,
  ASD_FREQ_MAX,
  ASD_FREQ_MIN,
  ASD_SAMPLE_COUNT,
  BLIND_SPOT_ANTENNA_THRESHOLD,
  BLIND_SPOT_PHI_DEG,
  BLIND_SPOT_THETA_DEG,
  INTERFEROMETER_EXAGGERATION,
  INTERFEROMETER_STRAIN_AMPLITUDE,
  INTERFEROMETER_WAVE_FREQUENCY,
  LASER_POWER_DEFAULT,
  LASER_POWER_RANGE,
  POWER_CHART_SAMPLE_RATE,
  POWER_CHART_WINDOW_S,
  type PolarizationId,
  PSI_DEG_RANGE,
  STEP_DT,
  THETA_DEG_RANGE,
  TIME_SPEED_MULTIPLIERS,
} from "../../GravitationalWavesConstants.js";

export class InterferometerModel implements TModel {
  public readonly timer = new TimeModel({
    initiallyPlaying: true,
    timeSpeedMultipliers: TIME_SPEED_MULTIPLIERS,
  });

  /** Real H1 ASD overlay (Welch of GW150914), for the sensitivity plot. */
  public readonly ligoAsd = LIGO_H1_ASD;

  public readonly armLengthKmProperty: NumberProperty;
  public readonly fabryPerotProperty: BooleanProperty;
  public readonly laserPowerProperty: NumberProperty;
  public readonly thetaProperty: NumberProperty;
  public readonly psiProperty: NumberProperty;
  /** Azimuth φ (degrees): 0 normally, 45° under the blind-spot preset. */
  public readonly phiProperty: NumberProperty;
  public readonly polarizationProperty: Property<PolarizationId>;
  public readonly blindSpotActiveProperty: BooleanProperty;
  public readonly seismicEnabledProperty: BooleanProperty;
  public readonly thermalEnabledProperty: BooleanProperty;
  public readonly shotEnabledProperty: BooleanProperty;
  public readonly showRealCurveProperty: BooleanProperty;
  /** Visual-only exaggeration of drawn ΔL (mirrors move; readouts stay real). */
  public readonly exaggerationProperty: NumberProperty;

  public readonly fPlusProperty: TReadOnlyProperty<number>;
  public readonly fCrossProperty: TReadOnlyProperty<number>;
  public readonly hPlusProperty: TReadOnlyProperty<number>;
  public readonly hCrossProperty: TReadOnlyProperty<number>;
  public readonly hDetProperty: TReadOnlyProperty<number>;
  public readonly armLengthMProperty: TReadOnlyProperty<number>;
  public readonly fabryPerotGainProperty: TReadOnlyProperty<number>;
  public readonly lxProperty: TReadOnlyProperty<number>;
  public readonly lyProperty: TReadOnlyProperty<number>;
  public readonly deltaLProperty: TReadOnlyProperty<number>;
  public readonly deltaPhiProperty: TReadOnlyProperty<number>;
  /** |F| for the active polarization (detector response amplitude). */
  public readonly detectorResponseProperty: TReadOnlyProperty<number>;
  /** ΔL amplitude = |F| · h · L (m). */
  public readonly deltaLAmplitudeProperty: TReadOnlyProperty<number>;
  /** Δφ amplitude from ΔL amplitude and Fabry–Pérot gain (rad). */
  public readonly deltaPhiAmplitudeProperty: TReadOnlyProperty<number>;
  public readonly outputPowerProperty: TReadOnlyProperty<number>;
  public readonly powerRatioProperty: TReadOnlyProperty<number>;
  /** Instantaneous (P_out − P_DC) / P_in about the fringe operating point. */
  public readonly deltaPowerRatioProperty: TReadOnlyProperty<number>;
  public readonly isBlindSpotProperty: TReadOnlyProperty<boolean>;

  /** Scrolling ΔP/P_in samples (AC about DC) for the power strip. */
  public readonly powerHistory: RingBuffer;

  private sampleAccumulator = 0;
  private applyingBlindSpot = false;
  private readonly unlinkAngleClear: () => void;
  private readonly disposeDerived: () => void;

  public constructor() {
    this.armLengthKmProperty = new NumberProperty(ARM_LENGTH_KM_DEFAULT, {
      range: ARM_LENGTH_KM_RANGE,
    });
    this.fabryPerotProperty = new BooleanProperty(true);
    this.laserPowerProperty = new NumberProperty(LASER_POWER_DEFAULT, {
      range: LASER_POWER_RANGE,
    });
    this.thetaProperty = new NumberProperty(0, { range: THETA_DEG_RANGE });
    this.psiProperty = new NumberProperty(0, { range: PSI_DEG_RANGE });
    this.phiProperty = new NumberProperty(0);
    this.polarizationProperty = new Property<PolarizationId>("plus", {
      validValues: ["plus", "cross"],
    });
    this.blindSpotActiveProperty = new BooleanProperty(false);
    this.seismicEnabledProperty = new BooleanProperty(true);
    this.thermalEnabledProperty = new BooleanProperty(true);
    this.shotEnabledProperty = new BooleanProperty(true);
    this.showRealCurveProperty = new BooleanProperty(true);
    this.exaggerationProperty = new NumberProperty(INTERFEROMETER_EXAGGERATION);

    const toRad = (deg: number) => (deg * Math.PI) / 180;

    this.fPlusProperty = new DerivedProperty(
      [this.thetaProperty, this.phiProperty, this.psiProperty],
      (theta, phi, psi) => antennaPattern(toRad(theta), toRad(phi), toRad(psi)).fPlus,
    );
    this.fCrossProperty = new DerivedProperty(
      [this.thetaProperty, this.phiProperty, this.psiProperty],
      (theta, phi, psi) => antennaPattern(toRad(theta), toRad(phi), toRad(psi)).fCross,
    );

    const phaseProperty = new DerivedProperty(
      [this.timer.timeProperty],
      (t) => 2 * Math.PI * INTERFEROMETER_WAVE_FREQUENCY * t,
    );
    this.hPlusProperty = new DerivedProperty([this.polarizationProperty, phaseProperty], (pol, phase) =>
      pol === "plus" ? INTERFEROMETER_STRAIN_AMPLITUDE * Math.cos(phase) : 0,
    );
    this.hCrossProperty = new DerivedProperty([this.polarizationProperty, phaseProperty], (pol, phase) =>
      pol === "cross" ? INTERFEROMETER_STRAIN_AMPLITUDE * Math.cos(phase) : 0,
    );
    this.hDetProperty = new DerivedProperty(
      [this.fPlusProperty, this.fCrossProperty, this.hPlusProperty, this.hCrossProperty],
      (fp, fc, hp, hc) => fp * hp + fc * hc,
    );
    this.armLengthMProperty = new DerivedProperty([this.armLengthKmProperty], (km) => km * 1000);
    this.fabryPerotGainProperty = new DerivedProperty([this.fabryPerotProperty], (on) => (on ? FABRY_PEROT_GAIN : 1));

    const armsProperty = new DerivedProperty([this.armLengthMProperty, this.hDetProperty], (L, hDet) =>
      armLengths(L, hDet),
    );
    this.lxProperty = new DerivedProperty([armsProperty], (a) => a.lx);
    this.lyProperty = new DerivedProperty([armsProperty], (a) => a.ly);
    this.deltaLProperty = new DerivedProperty([armsProperty], (a) => a.deltaL);
    this.deltaPhiProperty = new DerivedProperty([this.deltaLProperty, this.fabryPerotGainProperty], (deltaL, N) =>
      phaseDifference(deltaL, N),
    );
    this.detectorResponseProperty = new DerivedProperty(
      [this.polarizationProperty, this.fPlusProperty, this.fCrossProperty],
      (pol, fp, fc) => Math.abs(pol === "plus" ? fp : fc),
    );
    this.deltaLAmplitudeProperty = new DerivedProperty(
      [this.detectorResponseProperty, this.armLengthMProperty],
      (F, L) => F * INTERFEROMETER_STRAIN_AMPLITUDE * L,
    );
    this.deltaPhiAmplitudeProperty = new DerivedProperty(
      [this.deltaLAmplitudeProperty, this.fabryPerotGainProperty],
      (deltaLAmp, N) => Math.abs(phaseDifference(deltaLAmp, N)),
    );
    this.outputPowerProperty = new DerivedProperty([this.laserPowerProperty, this.deltaPhiProperty], (Pin, deltaPhi) =>
      outputPower(Pin, deltaPhi, DC_OFFSET_PHASE),
    );
    this.powerRatioProperty = new DerivedProperty([this.outputPowerProperty, this.laserPowerProperty], (Pout, Pin) =>
      Pin > 0 ? Pout / Pin : 0,
    );
    const dcPowerRatio = (() => {
      const s = Math.sin(0.5 * DC_OFFSET_PHASE);
      return s * s;
    })();
    this.deltaPowerRatioProperty = new DerivedProperty([this.powerRatioProperty], (ratio) => ratio - dcPowerRatio);
    this.isBlindSpotProperty = new DerivedProperty(
      [this.fPlusProperty, this.fCrossProperty],
      (fp, fc) => Math.abs(fp) < BLIND_SPOT_ANTENNA_THRESHOLD && Math.abs(fc) < BLIND_SPOT_ANTENNA_THRESHOLD,
    );

    this.powerHistory = new RingBuffer(Math.ceil(POWER_CHART_WINDOW_S * POWER_CHART_SAMPLE_RATE) + 1);

    const clearBlindSpot = () => {
      if (this.applyingBlindSpot) {
        return;
      }
      if (this.blindSpotActiveProperty.value) {
        this.blindSpotActiveProperty.value = false;
      }
      if (this.phiProperty.value !== 0) {
        this.phiProperty.value = 0;
      }
    };
    this.thetaProperty.lazyLink(clearBlindSpot);
    this.psiProperty.lazyLink(clearBlindSpot);
    this.unlinkAngleClear = () => {
      this.thetaProperty.unlink(clearBlindSpot);
      this.psiProperty.unlink(clearBlindSpot);
    };

    const derivedToDispose = [
      phaseProperty,
      armsProperty,
      this.fPlusProperty,
      this.fCrossProperty,
      this.hPlusProperty,
      this.hCrossProperty,
      this.hDetProperty,
      this.armLengthMProperty,
      this.fabryPerotGainProperty,
      this.lxProperty,
      this.lyProperty,
      this.deltaLProperty,
      this.deltaPhiProperty,
      this.detectorResponseProperty,
      this.deltaLAmplitudeProperty,
      this.deltaPhiAmplitudeProperty,
      this.outputPowerProperty,
      this.powerRatioProperty,
      this.deltaPowerRatioProperty,
      this.isBlindSpotProperty,
    ];
    this.disposeDerived = () => {
      for (const d of derivedToDispose) {
        d.dispose();
      }
    };
  }

  /** Apply the overhead blind-spot sky position (θ=90°, φ=45°). */
  public activateBlindSpot(): void {
    this.applyingBlindSpot = true;
    this.thetaProperty.value = BLIND_SPOT_THETA_DEG;
    this.phiProperty.value = BLIND_SPOT_PHI_DEG;
    this.blindSpotActiveProperty.value = true;
    this.applyingBlindSpot = false;
  }

  public antennaPattern(theta: number, phi: number, psi: number): { readonly fPlus: number; readonly fCross: number } {
    return antennaPattern(theta, phi, psi);
  }

  public armResponse(L: number, hDet: number): { readonly lx: number; readonly ly: number; readonly deltaL: number } {
    return armLengths(L, hDet);
  }

  public photodetectorPower(Pin: number, deltaL: number, N: number = FABRY_PEROT_GAIN): number {
    return outputPower(Pin, phaseDifference(deltaL, N), DC_OFFSET_PHASE);
  }

  /**
   * Instantaneous |ΔP / P_in| about the DC fringe level. At strain phase peak
   * (t = 0, overhead +) this is the AC amplitude used by the power strip.
   */
  public deltaPowerRatioMagnitude(): number {
    return Math.abs(this.deltaPowerRatioProperty.value);
  }

  /** Toy ASD curves on a log grid for the sensitivity chart. */
  public noiseCurves(): {
    readonly f: Float64Array;
    readonly seismic: Float64Array;
    readonly thermal: Float64Array;
    readonly shot: Float64Array;
    readonly total: Float64Array;
  } {
    const f = logFrequencyGrid(ASD_FREQ_MIN, ASD_FREQ_MAX, ASD_SAMPLE_COUNT);
    const seismic = new Float64Array(f.length);
    const thermal = new Float64Array(f.length);
    const shot = new Float64Array(f.length);
    const total = new Float64Array(f.length);
    const L = this.armLengthMProperty.value;
    const N = this.fabryPerotGainProperty.value;
    const powerRatio = this.laserPowerProperty.value;
    const params = { L, N, powerRatio };
    const enabled = {
      seismic: this.seismicEnabledProperty.value,
      thermal: this.thermalEnabledProperty.value,
      shot: this.shotEnabledProperty.value,
    };
    for (let i = 0; i < f.length; i++) {
      const fi = f[i] ?? ASD_FREQ_MIN;
      seismic[i] = seismicAsd(fi, L);
      thermal[i] = thermalAsd(fi, L);
      shot[i] = shotAsd(fi, L, N, powerRatio);
      total[i] = totalAsd(fi, params, enabled);
    }
    return { f, seismic, thermal, shot, total };
  }

  /** Frequency and ASD at the minimum of the enabled total curve. */
  public bestSensitivity(): { readonly frequency: number; readonly asd: number } {
    const { f, total } = this.noiseCurves();
    let bestI = 0;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < total.length; i++) {
      const v = total[i] ?? Number.POSITIVE_INFINITY;
      if (v < best) {
        best = v;
        bestI = i;
      }
    }
    return { frequency: f[bestI] ?? ASD_FREQ_MIN, asd: best };
  }

  public stepOnce(dt: number = STEP_DT): void {
    this.timer.advance(dt * this.timer.speedMultiplier);
    this.recordPower(dt * this.timer.speedMultiplier);
  }

  public reset(): void {
    this.applyingBlindSpot = true;
    this.timer.reset();
    this.armLengthKmProperty.reset();
    this.fabryPerotProperty.reset();
    this.laserPowerProperty.reset();
    this.thetaProperty.reset();
    this.psiProperty.reset();
    this.phiProperty.reset();
    this.polarizationProperty.reset();
    this.blindSpotActiveProperty.reset();
    this.seismicEnabledProperty.reset();
    this.thermalEnabledProperty.reset();
    this.shotEnabledProperty.reset();
    this.showRealCurveProperty.reset();
    this.exaggerationProperty.reset();
    this.powerHistory.clear();
    this.sampleAccumulator = 0;
    this.applyingBlindSpot = false;
  }

  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.timer.step(dt);
    this.recordPower(this.timer.scaledDt(dt));
  }

  public dispose(): void {
    this.unlinkAngleClear();
    this.disposeDerived();
    this.armLengthKmProperty.dispose();
    this.fabryPerotProperty.dispose();
    this.laserPowerProperty.dispose();
    this.thetaProperty.dispose();
    this.psiProperty.dispose();
    this.phiProperty.dispose();
    this.polarizationProperty.dispose();
    this.blindSpotActiveProperty.dispose();
    this.seismicEnabledProperty.dispose();
    this.thermalEnabledProperty.dispose();
    this.shotEnabledProperty.dispose();
    this.showRealCurveProperty.dispose();
    this.exaggerationProperty.dispose();
    this.timer.dispose();
  }

  private recordPower(simDt: number): void {
    if (!(simDt > 0)) {
      return;
    }
    this.sampleAccumulator += simDt;
    const interval = 1 / POWER_CHART_SAMPLE_RATE;
    while (this.sampleAccumulator >= interval) {
      this.sampleAccumulator -= interval;
      this.powerHistory.push(this.deltaPowerRatioProperty.value);
    }
  }
}
