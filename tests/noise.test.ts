import { expect, it } from "vitest";
import { logFrequencyGrid, seismicAsd, totalAsd } from "../src/common/model/NoiseModel.js";

const defaults = { L: 4000, N: 300, powerRatio: 1 };
const allOn = { seismic: true, thermal: true, shot: true };

it("totalAsd minimum with defaults lies in 100–250 Hz and [3e-24, 6e-24]", () => {
  const grid = logFrequencyGrid(10, 5000, 500);
  let minAsd = Number.POSITIVE_INFINITY;
  let minF = 0;
  for (const f of grid) {
    const h = totalAsd(f, defaults, allOn);
    if (h < minAsd) {
      minAsd = h;
      minF = f;
    }
  }
  expect(minF).toBeGreaterThanOrEqual(100);
  expect(minF).toBeLessThanOrEqual(250);
  expect(minAsd).toBeGreaterThanOrEqual(3e-24);
  expect(minAsd).toBeLessThanOrEqual(6e-24);
});

it("turning Fabry–Pérot off (N=1) raises the 500 Hz ASD by > 50×", () => {
  const withCavity = totalAsd(500, defaults, allOn);
  const without = totalAsd(500, { ...defaults, N: 1 }, allOn);
  expect(without / withCavity).toBeGreaterThan(50);
});

it("doubling L halves seismic ASD", () => {
  const a = seismicAsd(20, 4000);
  const b = seismicAsd(20, 8000);
  expect(b / a).toBeCloseTo(0.5, 12);
});

it("no terms enabled → finite floor", () => {
  const h = totalAsd(150, defaults, { seismic: false, thermal: false, shot: false });
  expect(Number.isFinite(h)).toBe(true);
  expect(h).toBeGreaterThan(0);
});
