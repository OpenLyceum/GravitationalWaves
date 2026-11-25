/**
 * WavesModel.ts
 *
 * Screen model for the Waves screen. Phase 1 wires the pure displacement kernel;
 * visual Properties land in later phases.
 */
import type { TModel } from "scenerystack/joist";
import { displace } from "../../common/model/testMassDisplacement.js";
import { TimeModel } from "../../common/TimeModel.js";

export class WavesModel implements TModel {
  public readonly timer = new TimeModel();

  /** First-order test-mass displacement under + / × strain (doc/model.md). */
  public displaceTestMass(
    x: number,
    y: number,
    hPlus: number,
    hCross: number,
  ): { readonly dx: number; readonly dy: number } {
    return displace(x, y, hPlus, hCross);
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
