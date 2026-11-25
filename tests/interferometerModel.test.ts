/**
 * InterferometerModel tests — reset, blind spot, Fabry–Pérot gain on Δφ.
 */
import { describe, expect, it } from "vitest";
import { FABRY_PEROT_GAIN } from "../src/common/model/Interferometer.js";
import {
  ARM_LENGTH_KM_DEFAULT,
  INTERFEROMETER_STRAIN_AMPLITUDE,
  LASER_POWER_DEFAULT,
} from "../src/GravitationalWavesConstants.js";
import { InterferometerModel } from "../src/interferometer/model/InterferometerModel.js";

describe("InterferometerModel", () => {
  it("reset restores defaults", () => {
    const model = new InterferometerModel();
    model.armLengthKmProperty.value = 1;
    model.fabryPerotProperty.value = false;
    model.laserPowerProperty.value = 5;
    model.thetaProperty.value = 45;
    model.psiProperty.value = 30;
    model.activateBlindSpot();
    model.seismicEnabledProperty.value = false;
    model.showRealCurveProperty.value = false;
    model.reset();
    expect(model.armLengthKmProperty.value).toBe(ARM_LENGTH_KM_DEFAULT);
    expect(model.fabryPerotProperty.value).toBe(true);
    expect(model.laserPowerProperty.value).toBe(LASER_POWER_DEFAULT);
    expect(model.thetaProperty.value).toBe(0);
    expect(model.psiProperty.value).toBe(0);
    expect(model.phiProperty.value).toBe(0);
    expect(model.blindSpotActiveProperty.value).toBe(false);
    expect(model.seismicEnabledProperty.value).toBe(true);
    expect(model.showRealCurveProperty.value).toBe(true);
    model.dispose();
  });

  it("blind spot gives |h_det| < 1e-12 · h", () => {
    const model = new InterferometerModel();
    model.activateBlindSpot();
    expect(Math.abs(model.fPlusProperty.value)).toBeLessThan(1e-12);
    expect(Math.abs(model.fCrossProperty.value)).toBeLessThan(1e-12);
    expect(Math.abs(model.hDetProperty.value)).toBeLessThan(1e-12 * INTERFEROMETER_STRAIN_AMPLITUDE);
    model.dispose();
  });

  it("Fabry–Pérot off lowers |Δφ| by 300×", () => {
    const model = new InterferometerModel();
    // cos(0)=1 → non-zero h_det at construction (t=0, overhead + wave).
    expect(Math.abs(model.deltaLProperty.value)).toBeGreaterThan(0);
    const withFp = Math.abs(model.deltaPhiProperty.value);
    model.fabryPerotProperty.value = false;
    const withoutFp = Math.abs(model.deltaPhiProperty.value);
    expect(withoutFp).toBeGreaterThan(0);
    expect(withFp / withoutFp).toBeCloseTo(FABRY_PEROT_GAIN, 6);
    model.dispose();
  });

  it("changing θ clears the blind-spot preset", () => {
    const model = new InterferometerModel();
    model.activateBlindSpot();
    expect(model.phiProperty.value).toBe(45);
    model.thetaProperty.value = 10;
    expect(model.blindSpotActiveProperty.value).toBe(false);
    expect(model.phiProperty.value).toBe(0);
    model.dispose();
  });

  it("ΔP amplitude scales with Fabry–Pérot gain N and arm length L", () => {
    const model = new InterferometerModel();
    // t = 0 → cos(phase) = 1; overhead + → F₊ = 1 → peak |h_det|.
    expect(model.timer.timeProperty.value).toBe(0);
    model.fabryPerotProperty.value = true;
    model.armLengthKmProperty.value = 4;
    const dpN = model.deltaPowerRatioMagnitude();
    model.fabryPerotProperty.value = false;
    const dp1 = model.deltaPowerRatioMagnitude();
    expect(dp1).toBeGreaterThan(0);
    // Slight fringe nonlinearity keeps the ratio within ~1e-4 of N.
    expect(dpN / dp1).toBeCloseTo(FABRY_PEROT_GAIN, 3);

    model.fabryPerotProperty.value = true;
    model.armLengthKmProperty.value = 2;
    const dpHalfL = model.deltaPowerRatioMagnitude();
    expect(dpN / dpHalfL).toBeCloseTo(2, 3);
    model.dispose();
  });

  it("detector response is |F₊| for + and |F×| for × at overhead", () => {
    const model = new InterferometerModel();
    expect(model.detectorResponseProperty.value).toBeCloseTo(1, 12);
    model.polarizationProperty.value = "cross";
    expect(model.detectorResponseProperty.value).toBeCloseTo(0, 12);
    model.dispose();
  });
});
