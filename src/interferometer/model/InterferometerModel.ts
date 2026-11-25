/**
 * InterferometerModel.ts
 *
 * Screen model for the Interferometer screen. Phase 1 exposes antenna, arm, power,
 * and toy-noise helpers; UI Properties land in later phases.
 */
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
import { logFrequencyGrid, totalAsd } from "../../common/model/NoiseModel.js";
import { TimeModel } from "../../common/TimeModel.js";

export class InterferometerModel implements TModel {
  public readonly timer = new TimeModel();

  /** Real H1 ASD overlay (Welch of GW150914), for the sensitivity plot. */
  public readonly ligoAsd = LIGO_H1_ASD;

  public antennaPattern(theta: number, phi: number, psi: number): { readonly fPlus: number; readonly fCross: number } {
    return antennaPattern(theta, phi, psi);
  }

  public armResponse(L: number, hDet: number): { readonly lx: number; readonly ly: number; readonly deltaL: number } {
    return armLengths(L, hDet);
  }

  public photodetectorPower(Pin: number, deltaL: number, N: number = FABRY_PEROT_GAIN): number {
    return outputPower(Pin, phaseDifference(deltaL, N), DC_OFFSET_PHASE);
  }

  /** Toy total ASD on a log grid (10 Hz–5 kHz). */
  public toyAsdCurve(
    L = 4000,
    N: number = FABRY_PEROT_GAIN,
    powerRatio = 1,
  ): { readonly f: Float64Array; readonly asd: Float64Array } {
    const f = logFrequencyGrid(10, 5000, 200);
    const asd = new Float64Array(f.length);
    const params = { L, N, powerRatio };
    const enabled = { seismic: true, thermal: true, shot: true };
    for (let i = 0; i < f.length; i++) {
      asd[i] = totalAsd(f[i] ?? 10, params, enabled);
    }
    return { f, asd };
  }

  public reset(): void {
    this.timer.reset();
  }

  public step(dt: number): void {
    this.timer.step(dt);
  }

  public dispose(): void {
    this.timer.dispose();
  }
}
