import { expect, it } from "vitest";
import {
  amplitude,
  chirpMass,
  generateWaveform,
  gwFrequency,
  iscoFrequency,
  timeInBand,
} from "../src/common/model/Chirp.js";

it("chirpMass for equal 30 M☉ binaries", () => {
  expect(chirpMass(30, 30)).toBeCloseTo(26.12, 2);
});

it("chirpMass for equal 1.4 M☉ binaries", () => {
  expect(chirpMass(1.4, 1.4)).toBeCloseTo(1.219, 3);
});

it("gwFrequency increases as tau → 0", () => {
  const mc = chirpMass(30, 30);
  const fFar = gwFrequency(1.0, mc);
  const fNear = gwFrequency(0.1, mc);
  const fCloser = gwFrequency(0.01, mc);
  expect(fNear).toBeGreaterThan(fFar);
  expect(fCloser).toBeGreaterThan(fNear);
});

it("timeInBand(20 Hz) for 1.219 M☉ chirp mass is 150–200 s", () => {
  const tau = timeInBand(20, 1.219);
  expect(tau).toBeGreaterThan(150);
  expect(tau).toBeLessThan(200);
});

it("amplitude at f=100 Hz for 30+30 at 400 Mpc is in [5e-22, 3e-21]", () => {
  const mc = chirpMass(30, 30);
  // Invert f(τ)=100 ⇒ τ = timeInBand(100, mc).
  const tau = timeInBand(100, mc);
  expect(gwFrequency(tau, mc)).toBeCloseTo(100, 0);
  const a = amplitude(tau, mc, 400);
  expect(a).toBeGreaterThanOrEqual(5e-22);
  expect(a).toBeLessThanOrEqual(3e-21);
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
