/**
 * WavesModel.ts
 *
 * Screen model for the Waves screen: polarization, visual exaggeration, real-scale
 * readout, and a scrolling strain history driven by TimeModel.
 */
import { DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { RingBuffer } from "../../common/model/RingBuffer.js";
import { displace } from "../../common/model/testMassDisplacement.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  BASELINE_LENGTHS_M,
  type BaselineId,
  type PolarizationId,
  REAL_STRAIN_EXPONENT_DEFAULT,
  REAL_STRAIN_EXPONENT_RANGE,
  STEP_DT,
  STRAIN_CHART_CYCLES,
  STRAIN_CHART_SAMPLE_RATE,
  TIME_SPEED_MULTIPLIERS,
  VISUAL_STRAIN_DEFAULT,
  VISUAL_STRAIN_RANGE,
  WAVES_FREQUENCY_DEFAULT,
  WAVES_FREQUENCY_RANGE,
} from "../../GravitationalWavesConstants.js";

export class WavesModel implements TModel {
  public readonly timer = new TimeModel({
    initiallyPlaying: true,
    timeSpeedMultipliers: TIME_SPEED_MULTIPLIERS,
  });

  public readonly polarizationProperty: Property<PolarizationId>;
  public readonly visualStrainProperty: NumberProperty;
  public readonly frequencyProperty: NumberProperty;
  public readonly realStrainExponentProperty: NumberProperty;
  public readonly baselineProperty: Property<BaselineId>;

  /** Instantaneous visual h₊. */
  public readonly hPlusProperty: TReadOnlyProperty<number>;
  /** Instantaneous visual h×. */
  public readonly hCrossProperty: TReadOnlyProperty<number>;
  /** Real strain amplitude h = 10^exponent. */
  public readonly realStrainProperty: TReadOnlyProperty<number>;
  /** Chosen baseline length L (m). */
  public readonly baselineLengthProperty: TReadOnlyProperty<number>;
  /** Real ΔL = h L (m). */
  public readonly deltaLProperty: TReadOnlyProperty<number>;

  /** Scrolling visual-strain samples for the mini plot. */
  public readonly strainHistory: RingBuffer;

  private sampleAccumulator = 0;
  private readonly disposeDerived: () => void;

  public constructor() {
    this.polarizationProperty = new Property<PolarizationId>("plus", {
      validValues: ["plus", "cross"],
    });
    this.visualStrainProperty = new NumberProperty(VISUAL_STRAIN_DEFAULT, {
      range: VISUAL_STRAIN_RANGE,
    });
    this.frequencyProperty = new NumberProperty(WAVES_FREQUENCY_DEFAULT, {
      range: WAVES_FREQUENCY_RANGE,
      units: "Hz",
    });
    this.realStrainExponentProperty = new NumberProperty(REAL_STRAIN_EXPONENT_DEFAULT, {
      range: REAL_STRAIN_EXPONENT_RANGE,
    });
    this.baselineProperty = new Property<BaselineId>("ligo", {
      validValues: ["meter", "ligo", "earthSun"],
    });

    const phaseProperty = new DerivedProperty(
      [this.timer.timeProperty, this.frequencyProperty],
      (t, f) => 2 * Math.PI * f * t,
    );

    this.hPlusProperty = new DerivedProperty(
      [this.polarizationProperty, this.visualStrainProperty, phaseProperty],
      (pol, h0, phase) => (pol === "plus" ? h0 * Math.cos(phase) : 0),
    );
    this.hCrossProperty = new DerivedProperty(
      [this.polarizationProperty, this.visualStrainProperty, phaseProperty],
      (pol, h0, phase) => (pol === "cross" ? h0 * Math.cos(phase) : 0),
    );
    this.realStrainProperty = new DerivedProperty([this.realStrainExponentProperty], (exp) => 10 ** exp);
    this.baselineLengthProperty = new DerivedProperty([this.baselineProperty], (id) => BASELINE_LENGTHS_M[id]);
    this.deltaLProperty = new DerivedProperty([this.realStrainProperty, this.baselineLengthProperty], (h, L) => h * L);

    const maxSamples = Math.ceil((STRAIN_CHART_CYCLES / WAVES_FREQUENCY_RANGE.min) * STRAIN_CHART_SAMPLE_RATE) + 1;
    this.strainHistory = new RingBuffer(maxSamples);

    const derivedToDispose = [
      phaseProperty,
      this.hPlusProperty,
      this.hCrossProperty,
      this.realStrainProperty,
      this.baselineLengthProperty,
      this.deltaLProperty,
    ];
    this.disposeDerived = () => {
      for (const d of derivedToDispose) {
        d.dispose();
      }
    };
  }

  /** First-order test-mass displacement under + / × strain (doc/model.md). */
  public displaceTestMass(
    x: number,
    y: number,
    hPlus: number,
    hCross: number,
  ): { readonly dx: number; readonly dy: number } {
    return displace(x, y, hPlus, hCross);
  }

  /** Advance one frame while paused (step-forward button). */
  public stepOnce(dt: number = STEP_DT): void {
    this.timer.advance(dt * this.timer.speedMultiplier);
    this.recordStrain(dt * this.timer.speedMultiplier);
  }

  public reset(): void {
    this.timer.reset();
    this.polarizationProperty.reset();
    this.visualStrainProperty.reset();
    this.frequencyProperty.reset();
    this.realStrainExponentProperty.reset();
    this.baselineProperty.reset();
    this.strainHistory.clear();
    this.sampleAccumulator = 0;
  }

  public step(dt: number): void {
    if (!this.timer.isPlayingProperty.value) {
      return;
    }
    this.timer.step(dt);
    this.recordStrain(this.timer.scaledDt(dt));
  }

  public dispose(): void {
    this.disposeDerived();
    this.polarizationProperty.dispose();
    this.visualStrainProperty.dispose();
    this.frequencyProperty.dispose();
    this.realStrainExponentProperty.dispose();
    this.baselineProperty.dispose();
    this.timer.dispose();
  }

  private recordStrain(simDt: number): void {
    if (!(simDt > 0)) {
      return;
    }
    this.sampleAccumulator += simDt;
    const interval = 1 / STRAIN_CHART_SAMPLE_RATE;
    while (this.sampleAccumulator >= interval) {
      this.sampleAccumulator -= interval;
      const pol = this.polarizationProperty.value;
      const h0 = this.visualStrainProperty.value;
      const phase = 2 * Math.PI * this.frequencyProperty.value * this.timer.timeProperty.value;
      const h = h0 * Math.cos(phase);
      // Plot the active polarization's strain (same magnitude either way).
      this.strainHistory.push(pol === "plus" || pol === "cross" ? h : 0);
    }
  }
}
