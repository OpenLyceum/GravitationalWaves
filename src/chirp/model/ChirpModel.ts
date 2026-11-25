/**
 * ChirpModel.ts
 *
 * Screen model for the Chirp screen. Phase 1 wires waveform, matched-filter, and
 * real-event loaders; UI Properties land in later phases.
 */
import type { TModel } from "scenerystack/joist";
import { catalogEvents, loadEvent } from "../../common/data/eventLibrary.js";
import {
  chirpMass,
  generateWaveform,
  iscoFrequency,
  ringdownFrequency,
  type Waveform,
} from "../../common/model/Chirp.js";
import { match, optimalSnr, snrScan } from "../../common/model/MatchedFilter.js";
import { totalAsd } from "../../common/model/NoiseModel.js";
import { SeededRandom, whiteNoise, whitenedSignal } from "../../common/model/whiten.js";
import { TimeModel } from "../../common/TimeModel.js";

const toyAsd = (f: number): number =>
  totalAsd(f, { L: 4000, N: 300, powerRatio: 1 }, { seismic: true, thermal: true, shot: true });

export class ChirpModel implements TModel {
  public readonly timer = new TimeModel();

  public readonly catalog = catalogEvents();

  public chirpMass(m1: number, m2: number): number {
    return chirpMass(m1, m2);
  }

  public generateWaveform(m1: number, m2: number, distanceMpc: number, sampleRate: number, duration: number): Waveform {
    return generateWaveform({ m1, m2, distanceMpc, sampleRate, duration });
  }

  public whitenedWaveform(waveform: Waveform, sampleRate: number): Float64Array {
    const totalMass = 60; // placeholder until Phase 2 owns mass Properties
    const fRing = ringdownFrequency(0.95 * totalMass);
    return whitenedSignal(waveform.h, waveform.f, toyAsd, sampleRate, fRing);
  }

  public optimalSnr(m1: number, m2: number, distanceMpc: number): number {
    return optimalSnr(chirpMass(m1, m2), m1 + m2, distanceMpc, toyAsd);
  }

  public matchTemplates(mc: number, mcTemplate: number, totalMass: number): number {
    return match(mc, mcTemplate, iscoFrequency(totalMass), toyAsd);
  }

  public snrScan(m1: number, m2: number, distanceMpc: number, nTemplates = 41): ReturnType<typeof snrScan> {
    const mc = chirpMass(m1, m2);
    return snrScan(mc, m1 + m2, distanceMpc, toyAsd, mc * 0.7, mc * 1.3, nTemplates);
  }

  public noise(n: number, seed: number): Float64Array {
    return whiteNoise(n, seed);
  }

  public rng(seed: number): SeededRandom {
    return new SeededRandom(seed);
  }

  public loadEvent(id: string): ReturnType<typeof loadEvent> {
    return loadEvent(id);
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
