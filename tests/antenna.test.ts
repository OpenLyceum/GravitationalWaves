import { expect, it } from "vitest";
import { antennaPattern } from "../src/common/model/AntennaPattern.js";

it("overhead (0,0,0) → fPlus=1, fCross=0", () => {
  const { fPlus, fCross } = antennaPattern(0, 0, 0);
  expect(fPlus).toBeCloseTo(1, 12);
  expect(fCross).toBeCloseTo(0, 12);
});

it("blind spot (π/2, π/4, any ψ) → both |F| < 1e-12", () => {
  for (const psi of [0, Math.PI / 6, Math.PI / 4, Math.PI / 3]) {
    const { fPlus, fCross } = antennaPattern(Math.PI / 2, Math.PI / 4, psi);
    expect(Math.abs(fPlus)).toBeLessThan(1e-12);
    expect(Math.abs(fCross)).toBeLessThan(1e-12);
  }
});

it("ψ=π/4 overhead → fPlus≈0, fCross≈1", () => {
  const { fPlus, fCross } = antennaPattern(0, 0, Math.PI / 4);
  expect(fPlus).toBeCloseTo(0, 12);
  expect(fCross).toBeCloseTo(1, 12);
});
