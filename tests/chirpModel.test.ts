/**
 * ChirpModel tests — SNR orientation, matched recovery, event presets, reset.
 */
import { describe, expect, it } from "vitest";
import { ChirpModel } from "../src/chirp/model/ChirpModel.js";
import { chirpMass } from "../src/common/model/Chirp.js";
import { optimalSnr } from "../src/common/model/MatchedFilter.js";
import { totalAsd } from "../src/common/model/NoiseModel.js";
import {
  CHIRP_DISTANCE_DEFAULT,
  CHIRP_M1_DEFAULT,
  CHIRP_M2_DEFAULT,
  ORIENTATION_FACTOR,
} from "../src/GravitationalWavesConstants.js";

const chirpToyAsd = (f: number): number =>
  totalAsd(f, { L: 4000, N: 300, powerRatio: 1 }, { seismic: true, thermal: true, shot: true });

describe("ChirpModel", () => {
  it("default optimal SNR is within 10 % of 0.4 × optimalSnr", () => {
    const model = new ChirpModel();
    const mc = chirpMass(CHIRP_M1_DEFAULT, CHIRP_M2_DEFAULT);
    const direct =
      ORIENTATION_FACTOR * optimalSnr(mc, CHIRP_M1_DEFAULT + CHIRP_M2_DEFAULT, CHIRP_DISTANCE_DEFAULT, chirpToyAsd);
    expect(model.optimalSnrProperty.value).toBeGreaterThan(0);
    expect(Math.abs(model.optimalSnrProperty.value - direct) / direct).toBeLessThanOrEqual(0.1);
    model.dispose();
  });

  it("template = signal ⇒ recovered SNR ≈ optimal (±1 %)", () => {
    const model = new ChirpModel();
    model.templateM1Property.value = model.m1Property.value;
    model.templateM2Property.value = model.m2Property.value;
    const opt = model.optimalSnrProperty.value;
    const recovered = model.recoveredSnrProperty.value;
    expect(opt).toBeGreaterThan(0);
    expect(Math.abs(recovered - opt) / opt).toBeLessThanOrEqual(0.01);
    model.dispose();
  });

  it("selecting GW150914 sets detector-frame masses ≈ 38.1 and 33.0", async () => {
    const model = new ChirpModel();
    model.sourceProperty.value = "GW150914";
    // Masses are applied synchronously; strain load is async.
    expect(model.m1Property.value).toBeCloseTo(38.06, 1);
    expect(model.m2Property.value).toBeCloseTo(33.0, 1);
    expect(model.distanceProperty.value).toBeCloseTo(470, 0);
    await new Promise((r) => setTimeout(r, 50));
    model.dispose();
  });

  it("editing a mass slider returns source to custom", () => {
    const model = new ChirpModel();
    model.sourceProperty.value = "GW150914";
    expect(model.sourceProperty.value).toBe("GW150914");
    model.m1Property.value = 40;
    expect(model.sourceProperty.value).toBe("custom");
    expect(model.loadedEventProperty.value).toBeNull();
    model.dispose();
  });

  it("reset restores defaults", () => {
    const model = new ChirpModel();
    model.m1Property.value = 50;
    model.m2Property.value = 40;
    model.distanceProperty.value = 1000;
    model.templateM1Property.value = 10;
    model.showHiddenSignalProperty.value = true;
    model.timer.timeProperty.value = 3;
    model.reset();
    expect(model.sourceProperty.value).toBe("custom");
    expect(model.m1Property.value).toBe(CHIRP_M1_DEFAULT);
    expect(model.m2Property.value).toBe(CHIRP_M2_DEFAULT);
    expect(model.distanceProperty.value).toBe(CHIRP_DISTANCE_DEFAULT);
    expect(model.templateM1Property.value).toBe(20);
    expect(model.showHiddenSignalProperty.value).toBe(false);
    expect(model.timer.timeProperty.value).toBe(0);
    model.dispose();
  });

  it("recompute after a slider change finishes under 200 ms", () => {
    const model = new ChirpModel();
    // Warm-up so the timed call is a steady-state slider recompute.
    model.m1Property.value = 35;
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      model.m1Property.value = 36 + i;
      times.push(performance.now() - t0);
    }
    const elapsed = Math.max(...times);
    // Generous CI bound; local desktops are typically ~30–60 ms (match dominates).
    expect(elapsed, `recompute took ${elapsed.toFixed(1)} ms`).toBeLessThan(200);
    model.dispose();
  });

  it("clamps m2 ≤ m1", () => {
    const model = new ChirpModel();
    model.m1Property.value = 25;
    expect(model.m2Property.value).toBeLessThanOrEqual(25);
    model.m2Property.value = 80;
    expect(model.m2Property.value).toBeLessThanOrEqual(model.m1Property.value);
    model.dispose();
  });

  it("clamps template m2 ≤ template m1", () => {
    const model = new ChirpModel();
    model.templateM1Property.value = 15;
    expect(model.templateM2Property.value).toBeLessThanOrEqual(15);
    model.templateM2Property.value = 90;
    expect(model.templateM2Property.value).toBeLessThanOrEqual(model.templateM1Property.value);
    model.dispose();
  });
});
