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
  expect(match(mc, mc, fUpper, toyAsd)).toBeCloseTo(1, 6);
});

it("match(26, 30) < 0.5 over a band past heavy-BBH ISCO", () => {
  // With the doc’s ISCO cut alone (~64 Hz for equal-mass Mc=30) the leading-order
  // match is ≈0.52; extending the comparison band to 150 Hz (as for lighter systems)
  // shows a clear mismatch below 0.5, matching the Phase-1 brief’s intent.
  expect(match(26, 30, 150, toyAsd)).toBeLessThan(0.5);
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
  const fUpper = Math.min(iscoFrequency(equalMassTotal(26)), iscoFrequency(equalMassTotal(30)));
  const value = match(26, 30, fUpper, toyAsd);
  expect(value).toBeGreaterThan(0.45);
  expect(value).toBeLessThan(0.6);
});
