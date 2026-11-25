import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { loadEvent } from "../src/common/data/eventLibrary.js";
import { NETWORK_SNR_DEFAULT } from "../src/GravitationalWavesConstants.js";
import { NetworkModel } from "../src/network/model/NetworkModel.js";
import { GW150914_MEASURED_DELAY } from "../src/network/model/networkPresets.js";

describe("NetworkModel", () => {
  it("starts with H1 + L1 and a ring-shaped (large) region", () => {
    const model = new NetworkModel();
    expect(model.enabledDetectors()).toEqual(["H1", "L1"]);
    expect(model.pairsProperty.value).toHaveLength(1);
    expect(model.skyMapProperty.value.area90).toBeGreaterThan(100);
    model.dispose();
  });

  it("adding Virgo shrinks the region; per-detector SNRs add to the network SNR", () => {
    const model = new NetworkModel();
    model.measurementNoiseProperty.value = false;
    const twoArea = model.skyMapProperty.value.area90;
    model.detectorEnabledProperties.V1.value = true;
    expect(model.skyMapProperty.value.area90).toBeLessThan(twoArea / 3);
    const snr = Math.hypot(...model.readingsProperty.value.map((r) => r.snr));
    expect(snr).toBeCloseTo(NETWORK_SNR_DEFAULT, 6);
    expect(model.pointingErrorProperty.value!).toBeLessThan(2);
    model.dispose();
  });

  it("GW170817 preset: three detectors, Virgo SNR 2, area near the published 28 deg²", () => {
    const model = new NetworkModel();
    model.sourceProperty.value = "GW170817";
    expect(model.enabledDetectors()).toEqual(["H1", "L1", "V1"]);
    const virgo = model.readingsProperty.value.find((r) => r.id === "V1")!;
    expect(virgo.snr).toBe(2);
    expect(model.skyMapProperty.value.area90).toBeLessThan(60);
    expect(model.publishedAreaProperty.value).toBe(28);
    model.dispose();
  });

  it("GW150914 preset has no known position and uses the measured delay", () => {
    const model = new NetworkModel();
    model.sourceProperty.value = "GW150914";
    expect(model.truthKnownProperty.value).toBe(false);
    expect(model.pointingErrorProperty.value).toBeNull();
    expect(model.pairsProperty.value[0]!.delay).toBeCloseTo(GW150914_MEASURED_DELAY, 9);
    model.dispose();
  });

  it("editing the network returns to custom; reset restores defaults", () => {
    const model = new NetworkModel();
    model.sourceProperty.value = "GW170814";
    model.detectorEnabledProperties.K1.value = true;
    expect(model.sourceProperty.value).toBe("custom");
    model.reset();
    expect(model.enabledDetectors()).toEqual(["H1", "L1"]);
    expect(model.sourceProperty.value).toBe("custom");
    model.dispose();
  });

  it("traces arrive later in the detector the wave reaches later", () => {
    const model = new NetworkModel();
    model.measurementNoiseProperty.value = false;
    model.sourcePositionProperty.value = new Vector2(-150, 50); // much nearer Hanford
    const [h1, l1] = model.readingsProperty.value;
    // Envelope: moving RMS over 4 ms, then the time of its maximum.
    const envelopePeak = (trace: Float64Array) => {
      const half = 16;
      let best = 0;
      let bestValue = 0;
      for (let i = half; i < trace.length - half; i++) {
        let sum = 0;
        for (let j = i - half; j <= i + half; j++) {
          sum += trace[j]! * trace[j]!;
        }
        if (sum > bestValue) {
          bestValue = sum;
          best = i;
        }
      }
      return model.traceTimes[best]!;
    };
    const expected = h1!.arrival - l1!.arrival;
    expect(expected).toBeLessThan(-5e-3);
    const measured =
      envelopePeak(model.tracesProperty.value.get("H1")!) - envelopePeak(model.tracesProperty.value.get("L1")!);
    expect(measured).toBeCloseTo(expected, 3);
    model.dispose();
  });

  it("the bundled GWOSC strain reproduces GW150914's measured H1 − L1 delay", async () => {
    const event = await loadEvent("GW150914");
    const fs = event.H1.sampleRate;
    const end = Math.round((0.05 - event.H1.startOffset) * fs);
    const start = end - Math.round(0.35 * fs);
    let bestLag = 0;
    let best = 0;
    for (let lag = -22; lag <= 22; lag++) {
      let sum = 0;
      for (let i = start; i < end; i++) {
        sum += event.H1.samples[i]! * event.L1.samples[i - lag]!;
      }
      if (Math.abs(sum) > Math.abs(best)) {
        best = sum;
        bestLag = lag;
      }
    }
    expect(best).toBeLessThan(0); // sign-inverted: the sites' arms are rotated by ≈ 90°
    expect(bestLag / fs).toBeCloseTo(GW150914_MEASURED_DELAY, 3);
  });
});
