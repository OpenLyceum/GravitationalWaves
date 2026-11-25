/**
 * DetectorNetwork.ts
 *
 * Geometry of the ground-based detector network on a spherical Earth: site positions,
 * arm directions, light-travel arrival delays and antenna response to a wave from a
 * given sky direction (see doc/model.md, "Screen 4 — Network").
 *
 * Frame: Earth-centred, Earth-fixed (x toward lon 0 on the equator, z toward the north
 * pole). A sky direction is written as the point on Earth directly beneath the source
 * (longitude, latitude in radians).
 */

import { C } from "./PhysicalConstants.js";

/** Mean Earth radius (m). Site elevations and the Earth's flattening are ignored. */
export const EARTH_RADIUS = 6.371e6;

export type DetectorId = "H1" | "L1" | "V1" | "K1";

export type DetectorSite = {
  readonly id: DetectorId;
  /** Geodetic latitude (degrees). */
  readonly latitudeDeg: number;
  /** Longitude, east positive (degrees). */
  readonly longitudeDeg: number;
  /** Arm azimuths, degrees clockwise from local north. */
  readonly xArmAzimuthDeg: number;
  readonly yArmAzimuthDeg: number;
};

/** Site data from LALSuite's LALDetectors.h (rounded). */
export const DETECTOR_SITES: Readonly<Record<DetectorId, DetectorSite>> = {
  H1: { id: "H1", latitudeDeg: 46.4551, longitudeDeg: -119.4077, xArmAzimuthDeg: 324.0, yArmAzimuthDeg: 234.0 },
  L1: { id: "L1", latitudeDeg: 30.5629, longitudeDeg: -90.7742, xArmAzimuthDeg: 252.28, yArmAzimuthDeg: 162.28 },
  V1: { id: "V1", latitudeDeg: 43.6316, longitudeDeg: 10.5045, xArmAzimuthDeg: 19.43, yArmAzimuthDeg: 289.43 },
  K1: { id: "K1", latitudeDeg: 36.4115, longitudeDeg: 137.3056, xArmAzimuthDeg: 60.4, yArmAzimuthDeg: 150.4 },
};

export const DETECTOR_IDS: readonly DetectorId[] = ["H1", "L1", "V1", "K1"];

export type Vec3 = readonly [number, number, number];

const DEG = Math.PI / 180;

/** Outward unit vector at (lon, lat) in radians. */
export function unitVector(lon: number, lat: number): Vec3 {
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), cosLat * Math.sin(lon), Math.sin(lat)];
}

function eastVector(lon: number): Vec3 {
  return [-Math.sin(lon), Math.cos(lon), 0];
}

function northVector(lon: number, lat: number): Vec3 {
  const sinLat = Math.sin(lat);
  return [-sinLat * Math.cos(lon), -sinLat * Math.sin(lon), Math.cos(lat)];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

type Tensor = readonly [Vec3, Vec3, Vec3];

/** Detector position (m) and symmetric detector tensor D = ½(x xᵀ − y yᵀ), by rows. */
export type DetectorGeometry = {
  readonly id: DetectorId;
  readonly position: Vec3;
  readonly tensor: Tensor;
};

/** uᵀ D v. */
function contract(D: Tensor, u: Vec3, v: Vec3): number {
  return u[0] * dot(D[0], v) + u[1] * dot(D[1], v) + u[2] * dot(D[2], v);
}

function armVector(lon: number, lat: number, azimuthDeg: number): Vec3 {
  const az = azimuthDeg * DEG;
  const e = eastVector(lon);
  const n = northVector(lon, lat);
  return [
    Math.cos(az) * n[0] + Math.sin(az) * e[0],
    Math.cos(az) * n[1] + Math.sin(az) * e[1],
    Math.cos(az) * n[2] + Math.sin(az) * e[2],
  ];
}

/** Row i of ½(x xᵀ − y yᵀ). */
function tensorRow(xi: number, yi: number, x: Vec3, y: Vec3): Vec3 {
  return [0.5 * (xi * x[0] - yi * y[0]), 0.5 * (xi * x[1] - yi * y[1]), 0.5 * (xi * x[2] - yi * y[2])];
}

/** Position and detector tensor for a site. */
export function detectorGeometry(site: DetectorSite): DetectorGeometry {
  const lon = site.longitudeDeg * DEG;
  const lat = site.latitudeDeg * DEG;
  const up = unitVector(lon, lat);
  const x = armVector(lon, lat, site.xArmAzimuthDeg);
  const y = armVector(lon, lat, site.yArmAzimuthDeg);
  const tensor: Tensor = [tensorRow(x[0], y[0], x, y), tensorRow(x[1], y[1], x, y), tensorRow(x[2], y[2], x, y)];
  return {
    id: site.id,
    position: [EARTH_RADIUS * up[0], EARTH_RADIUS * up[1], EARTH_RADIUS * up[2]],
    tensor,
  };
}

/**
 * Arrival time at the detector relative to the Earth's centre (s) for a source in the
 * direction n̂: t = −(r · n̂)/c. A detector closer to the source hears the wave first.
 */
export function arrivalDelay(detector: DetectorGeometry, sourceLon: number, sourceLat: number): number {
  return -dot(detector.position, unitVector(sourceLon, sourceLat)) / C;
}

/** Light-travel time between two detectors (s): the largest delay that is possible. */
export function lightTravelTime(a: DetectorGeometry, b: DetectorGeometry): number {
  const dx = a.position[0] - b.position[0];
  const dy = a.position[1] - b.position[1];
  const dz = a.position[2] - b.position[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / C;
}

/**
 * Antenna factors F₊ = D:e₊, F× = D:e× for a source beneath (lon, lat) with polarization
 * angle ψ. Wave-frame axes are local east and north at the sub-source point, rotated by ψ.
 */
export function networkAntennaPattern(
  detector: DetectorGeometry,
  sourceLon: number,
  sourceLat: number,
  psi: number,
): { readonly fPlus: number; readonly fCross: number } {
  const e = eastVector(sourceLon);
  const n = northVector(sourceLon, sourceLat);
  const c = Math.cos(psi);
  const s = Math.sin(psi);
  const a: Vec3 = [c * e[0] + s * n[0], c * e[1] + s * n[1], c * e[2] + s * n[2]];
  const b: Vec3 = [-s * e[0] + c * n[0], -s * e[1] + c * n[1], -s * e[2] + c * n[2]];
  const D = detector.tensor;
  return {
    fPlus: contract(D, a, a) - contract(D, b, b),
    fCross: contract(D, a, b) + contract(D, b, a),
  };
}

/**
 * Response of a detector to a face-on (circularly polarized) source: the signal amplitude
 * is √(F₊² + F×²) times the wave amplitude, independent of ψ, and the signal phase is
 * shifted by atan2(F×, F₊).
 */
export function circularResponse(
  detector: DetectorGeometry,
  sourceLon: number,
  sourceLat: number,
): { readonly amplitude: number; readonly phase: number } {
  const { fPlus, fCross } = networkAntennaPattern(detector, sourceLon, sourceLat, 0);
  return { amplitude: Math.hypot(fPlus, fCross), phase: Math.atan2(fCross, fPlus) };
}

/**
 * Greenwich mean sidereal time (radians, 0–2π) at a GPS time, from the IAU 1982 linear
 * term. Accurate to a fraction of a degree, enough to place a catalog RA on the map.
 */
export function greenwichSiderealTime(gpsSeconds: number): number {
  const GPS_EPOCH_UNIX = 315964800;
  const LEAP_SECONDS = 18; // GPS − UTC since 2017; 17 for 2015–2016 (0.004° error)
  const unix = gpsSeconds + GPS_EPOCH_UNIX - LEAP_SECONDS;
  const julianDate = unix / 86400 + 2440587.5;
  const degrees = 280.46061837 + 360.98564736629 * (julianDate - 2451545.0);
  return ((((degrees % 360) + 360) % 360) * Math.PI) / 180;
}

/** Earth-fixed longitude (radians, −π..π) beneath a source of right ascension ra (radians). */
export function subSourceLongitude(ra: number, gpsSeconds: number): number {
  const lon = ra - greenwichSiderealTime(gpsSeconds);
  return Math.atan2(Math.sin(lon), Math.cos(lon));
}
