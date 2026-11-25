import { expect, it } from "vitest";
import { chirpMass, generateWaveform, iscoFrequency, timeInBand } from "../src/common/model/Chirp.js";

it("chirpMass for equal 30 M☉ binaries", () => {
  expect(chirpMass(30, 30)).toBeCloseTo(26.12, 2);
});

it("chirpMass for equal 1.4 M☉ binaries", () => {
  expect(chirpMass(1.4, 1.4)).toBeCloseTo(1.219, 3);
});

it("gw frequency increases as the waveform approaches merger", () => {
  const w = generateWaveform({ m1: 30, m2: 30, distanceMpc: 400, sampleRate: 2048, duration: 0.5 });
  const early = Math.floor(w.mergerIndex * 0.2);
  const late = Math.max(0, w.mergerIndex - 5);
  expect(w.f[late] ?? 0).toBeGreaterThan(w.f[early] ?? 0);
});

it("timeInBand(20 Hz) for 1.219 M☉ chirp mass is 150–200 s", () => {
  const tau = timeInBand(20, 1.219);
  expect(tau).toBeGreaterThan(150);
  expect(tau).toBeLessThan(200);
});

it("strain envelope at f≈100 Hz for 30+30 at 400 Mpc is in [5e-22, 3e-21]", () => {
  const mc = chirpMass(30, 30);
  const tau = timeInBand(100, mc);
  const w = generateWaveform({
    m1: 30,
    m2: 30,
    distanceMpc: 400,
    sampleRate: 2048,
    duration: Math.min(2, tau + 0.2),
  });
  let bestI = 0;
  let bestDf = Number.POSITIVE_INFINITY;
  for (let i = 0; i < w.mergerIndex; i++) {
    const df = Math.abs((w.f[i] ?? 0) - 100);
    if (df < bestDf) {
      bestDf = df;
      bestI = i;
    }
  }
  // Take the local peak of |h| so the cos(Φ) phase does not understate the envelope.
  let peak = 0;
  const lo = Math.max(0, bestI - 40);
  const hi = Math.min(w.mergerIndex, bestI + 40);
  for (let i = lo; i < hi; i++) {
    peak = Math.max(peak, Math.abs(w.h[i] ?? 0));
  }
  expect(peak).toBeGreaterThanOrEqual(5e-22);
  expect(peak).toBeLessThanOrEqual(3e-21);
});

it("iscoFrequency(60) ≈ 73.3 Hz", () => {
  expect(iscoFrequency(60)).toBeCloseTo(73.3, 0);
});

it("generateWaveform length, finiteness, and BNS cutoff", () => {
  const duration = 0.5;
  const sampleRate = 2048;
  const bbh = generateWaveform({ m1: 30, m2: 30, distanceMpc: 400, sampleRate, duration });
  const expected = Math.round((duration + 0.1) * sampleRate);
  expect(bbh.t.length).toBe(expected);
  expect(bbh.h.length).toBe(expected);
  expect(bbh.f.length).toBe(expected);
  for (let i = 0; i < bbh.h.length; i++) {
    expect(Number.isFinite(bbh.h[i])).toBe(true);
    expect(Number.isFinite(bbh.f[i])).toBe(true);
  }

  const bns = generateWaveform({ m1: 1.4, m2: 1.4, distanceMpc: 40, sampleRate, duration });
  for (let i = bns.mergerIndex + 1; i < bns.h.length; i++) {
    expect(bns.h[i]).toBe(0);
  }
});
