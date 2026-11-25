/**
 * WavesModel tests — reset restores defaults; derived strain and ΔL behave.
 */
import { describe, expect, it } from "vitest";
import {
  REAL_STRAIN_EXPONENT_DEFAULT,
  VISUAL_STRAIN_DEFAULT,
  WAVES_FREQUENCY_DEFAULT,
} from "../src/GravitationalWavesConstants.js";
import { WavesModel } from "../src/waves/model/WavesModel.js";

describe("WavesModel", () => {
  it("reset restores defaults", () => {
    const model = new WavesModel();
    model.polarizationProperty.value = "cross";
    model.visualStrainProperty.value = 0.3;
    model.frequencyProperty.value = 2;
    model.realStrainExponentProperty.value = -18;
    model.baselineProperty.value = "meter";
    model.timer.timeProperty.value = 10;
    model.reset();
    expect(model.polarizationProperty.value).toBe("plus");
    expect(model.visualStrainProperty.value).toBe(VISUAL_STRAIN_DEFAULT);
    expect(model.frequencyProperty.value).toBe(WAVES_FREQUENCY_DEFAULT);
    expect(model.realStrainExponentProperty.value).toBe(REAL_STRAIN_EXPONENT_DEFAULT);
    expect(model.baselineProperty.value).toBe("ligo");
    expect(model.timer.timeProperty.value).toBe(0);
    model.dispose();
  });

  it("real ΔL = h · L for the LIGO baseline", () => {
    const model = new WavesModel();
    expect(model.realStrainProperty.value).toBeCloseTo(1e-21, 30);
    expect(model.baselineLengthProperty.value).toBe(4000);
    expect(model.deltaLProperty.value).toBeCloseTo(4e-18, 30);
    model.dispose();
  });
});
