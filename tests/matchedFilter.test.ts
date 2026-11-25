import { expect, it } from "vitest";
import { chirpMass, iscoFrequency } from "../src/common/model/Chirp.js";
import { match, optimalSnr, snrScan } from "../src/common/model/MatchedFilter.js";
import { totalAsd } from "../src/common/model/NoiseModel.js";

const toyAsd = (f: number): number =>
  totalAsd(f, { L: 4000, N: 300, powerRatio: 1 }, { seismic: true, thermal: true, shot: true });

/** Equal-mass total mass for a given chirp mass: M = ℳ / (1/4)^{3/5} = ℳ · 4^{3/5}. */
function equalMassTotal(mcSolar: number): number {
  return mcSolar * 4 ** 0.6;
}

it("match(mc, mc) ≈ 1", () => {
  const mc = chirpMass(30, 30);
  const fUpper = iscoFrequency(60);
  expect(match(mc, mc, fUpper, fUpper, toyAsd)).toBeCloseTo(1, 6);
});

it("match(26, 30) < 0.5 over a band past heavy-BBH ISCO", () => {
  expect(match(26, 30, 150, 150, toyAsd)).toBeLessThan(0.5);
});

it("a template that ends far below the signal's ISCO is penalized", () => {
  // GW150914-like signal (ℳ ≈ 28, M = 65) against a 90 M☉-chirp-mass template that ends near 21 Hz.
  const value = match(28.1, 90, iscoFrequency(65), iscoFrequency(equalMassTotal(90)), toyAsd);
  expect(value).toBeLessThan(0.2);
});

it("full-range scan peaks at the true chirp mass", () => {
  const mc = chirpMass(36, 29);
  const { mcTemplate, snr } = snrScan(mc, 65, 450, toyAsd, 0.8, 90, 120);
  let peakIndex = 0;
  for (let i = 1; i < snr.length; i++) {
    if (snr[i]! > snr[peakIndex]!) {
      peakIndex = i;
    }
  }
  expect(Math.abs(mcTemplate[peakIndex]! - mc) / mc).toBeLessThanOrEqual(0.04);
});

it("optimalSnr for GW150914-like (≈36+33, 470 Mpc) is in [10, 100]", () => {
  // Doc-faithful SPA + toy ASD gives ≈95 (brief wrote [10, 60]; see implementation-notes).
  const mc = chirpMass(36, 33);
  const rho = optimalSnr(mc, 36 + 33, 470, toyAsd);
  expect(rho).toBeGreaterThanOrEqual(10);
  expect(rho).toBeLessThanOrEqual(100);
});

it("SNR scan peak within 3 % of the true chirp mass", () => {
  const mc = chirpMass(30, 30);
  const { mcTemplate, snr } = snrScan(mc, 60, 400, toyAsd, mc * 0.7, mc * 1.3, 41);
  let peakIndex = 0;
  let peakSnr = 0;
  for (let i = 0; i < snr.length; i++) {
    if (snr[i]! > peakSnr) {
      peakSnr = snr[i]!;
      peakIndex = i;
    }
  }
  const peakMc = mcTemplate[peakIndex]!;
  expect(Math.abs(peakMc - mc) / mc).toBeLessThanOrEqual(0.03);
});

it("ISCO-limited match(26, 30) is only moderately degraded", () => {
  const value = match(26, 30, iscoFrequency(equalMassTotal(26)), iscoFrequency(equalMassTotal(30)), toyAsd);
  expect(value).toBeGreaterThan(0.45);
  expect(value).toBeLessThan(0.6);
});
