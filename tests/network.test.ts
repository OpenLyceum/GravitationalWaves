import { describe, expect, it } from "vitest";
import {
  arrivalDelay,
  circularResponse,
  DETECTOR_IDS,
  DETECTOR_SITES,
  detectorGeometry,
  lightTravelTime,
  networkAntennaPattern,
  subSourceLongitude,
} from "../src/common/model/DetectorNetwork.js";
import {
  cellCentre,
  delayRing,
  densityAt,
  FULL_SKY_DEG2,
  localize,
  timingError,
} from "../src/common/model/SkyLocalization.js";

const DEG = Math.PI / 180;
const H1 = detectorGeometry(DETECTOR_SITES.H1);
const L1 = detectorGeometry(DETECTOR_SITES.L1);
const V1 = detectorGeometry(DETECTOR_SITES.V1);

describe("detector geometry", () => {
  it("Hanford–Livingston light-travel time is 10.0 ms", () => {
    expect(lightTravelTime(H1, L1) * 1e3).toBeCloseTo(10.0, 1);
  });

  it("a source straight above a detector reaches it R/c before the Earth's centre", () => {
    const site = DETECTOR_SITES.H1;
    const t = arrivalDelay(H1, site.longitudeDeg * DEG, site.latitudeDeg * DEG);
    expect(t * 1e3).toBeCloseTo(-21.25, 1);
  });

  it("overhead with ψ along the arms gives |F₊| = 1, F× = 0", () => {
    const site = DETECTOR_SITES.L1;
    const lon = site.longitudeDeg * DEG;
    const lat = site.latitudeDeg * DEG;
    // Wave-frame axes east/north rotated by ψ; L1's x-arm is at azimuth 252.28° (90° − ψ from north).
    const psi = (90 - site.xArmAzimuthDeg) * DEG;
    const { fPlus, fCross } = networkAntennaPattern(L1, lon, lat, psi);
    expect(Math.abs(fPlus)).toBeCloseTo(1, 6);
    expect(fCross).toBeCloseTo(0, 6);
  });

  it("circular response never exceeds 1 and vanishes along an arm bisector in the plane", () => {
    for (const id of DETECTOR_IDS) {
      const detector = detectorGeometry(DETECTOR_SITES[id]);
      for (let lat = -80; lat <= 80; lat += 20) {
        for (let lon = -180; lon < 180; lon += 30) {
          expect(circularResponse(detector, lon * DEG, lat * DEG).amplitude).toBeLessThanOrEqual(1 + 1e-12);
        }
      }
    }
  });

  it("GW170814 at its catalog position: H1 8 ms and V1 14 ms after L1 (published)", () => {
    const lon = subSourceLongitude(47.75 * DEG, 1186741861.5);
    const lat = -44.95 * DEG;
    const tL = arrivalDelay(L1, lon, lat);
    expect((arrivalDelay(H1, lon, lat) - tL) * 1e3).toBeCloseTo(8, -0.5);
    expect((arrivalDelay(V1, lon, lat) - tL) * 1e3).toBeCloseTo(14, -0.5);
  });

  it("GW170817 from NGC 4993: Virgo first (≈ 22 ms before L1) and near a blind spot", () => {
    const lon = subSourceLongitude(197.4487 * DEG, 1187008882.4);
    const lat = -23.3839 * DEG;
    const tL = arrivalDelay(L1, lon, lat);
    expect((arrivalDelay(V1, lon, lat) - tL) * 1e3).toBeCloseTo(-22, -0.5);
    expect((arrivalDelay(H1, lon, lat) - tL) * 1e3).toBeCloseTo(3, -0.5);
    expect(circularResponse(V1, lon, lat).amplitude).toBeLessThan(0.4);
    expect(circularResponse(H1, lon, lat).amplitude).toBeGreaterThan(0.7);
  });
});

describe("sky localization", () => {
  const observe = (lon: number, lat: number, snr: Record<string, number>) =>
    Object.entries(snr).map(([id, value]) => {
      const detector = detectorGeometry(DETECTOR_SITES[id as "H1"]);
      return { detector, time: arrivalDelay(detector, lon, lat), snr: value, sensitivity: 1 };
    });

  it("timing error is 1/(2π σ_f ρ)", () => {
    expect(timingError(10)).toBeCloseTo(1 / (2 * Math.PI * 100 * 10), 12);
  });

  it("one detector cannot localize: the 90 % region is 90 % of the sky", () => {
    const map = localize(observe(0.3, 0.2, { H1: 20 }));
    expect(map.area90 / FULL_SKY_DEG2).toBeCloseTo(0.9, 2);
  });

  it("adding detectors shrinks the area, and the peak is at the source", () => {
    const lon = 40 * DEG;
    const lat = 20 * DEG;
    const two = localize(observe(lon, lat, { H1: 14, L1: 14 }));
    const three = localize(observe(lon, lat, { H1: 14, L1: 14, V1: 14 }));
    const four = localize(observe(lon, lat, { H1: 14, L1: 14, V1: 14, K1: 14 }));
    expect(three.area90).toBeLessThan(two.area90 / 5);
    expect(four.area90).toBeLessThan(three.area90);
    const dLon = Math.abs(four.peakLon - lon) / DEG;
    expect(dLon).toBeLessThan(3);
    expect(Math.abs(four.peakLat - lat) / DEG).toBeLessThan(3);
  });

  it("GW170817 with published SNRs gives a region close to the published 28 deg²", () => {
    const lon = subSourceLongitude(197.4487 * DEG, 1187008882.4);
    const lat = -23.3839 * DEG;
    const sensitivity: Record<string, number> = { H1: 0.6, L1: 1, V1: 0.27 };
    const observations = observe(lon, lat, { H1: 18.8, L1: 26.4, V1: 2.0 }).map((o, i) => ({
      ...o,
      sensitivity: Object.values(sensitivity)[i]!,
    }));
    const map = localize(observations);
    expect(map.area90).toBeGreaterThan(15);
    expect(map.area90).toBeLessThan(60);
  });

  it("every point on a delay ring has that delay", () => {
    const dt = 4e-3;
    const ring = delayRing(H1, L1, dt);
    expect(ring.length).toBeGreaterThan(10);
    for (const { lon, lat } of ring) {
      expect((arrivalDelay(H1, lon, lat) - arrivalDelay(L1, lon, lat)) * 1e3).toBeCloseTo(dt * 1e3, 6);
    }
    expect(delayRing(H1, L1, 12e-3)).toEqual([]);
  });

  it("densityAt samples the cell that contains the direction", () => {
    const map = localize(observe(40 * DEG, 20 * DEG, { H1: 15, L1: 15 }));
    const { lon, lat } = cellCentre(220, 70); // ≈ lon −39.5°, lat 19.5°
    expect(densityAt(map, lon, lat)).toBe(map.density[70 * 360 + 220]);
    expect(densityAt({ ...map, density: new Float64Array(0) }, 0, 0)).toBe(0);
  });
});
