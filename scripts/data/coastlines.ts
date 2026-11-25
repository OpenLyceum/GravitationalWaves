/**
 * scripts/data/coastlines.ts
 *
 * Natural Earth 1:110m coastlines (public domain) thinned for the Network screen map.
 * Each line becomes a flat [lon, lat, lon, lat, …] array in tenths of a degree.
 */

import { fetchBinary } from "./fetchCache.js";

const COASTLINE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_coastline.geojson";

/** Drop points closer than this to the previously kept point (degrees). */
const MIN_SPACING_DEG = 0.8;

/** Drop islands shorter than this many kept points. */
const MIN_POINTS = 4;

type LineFeature = { readonly geometry: { readonly type: string; readonly coordinates: number[][] } };

/** Downloads and thins the coastline; returns one tenths-of-degree array per line. */
export async function buildCoastlines(): Promise<number[][]> {
  const bytes = await fetchBinary(COASTLINE_URL, "ne_110m_coastline.geojson");
  const features = (JSON.parse(bytes.toString("utf8")) as { features: LineFeature[] }).features;
  const lines: number[][] = [];
  for (const feature of features) {
    if (feature.geometry.type !== "LineString") {
      continue;
    }
    const points = feature.geometry.coordinates;
    const kept: number[][] = [];
    for (let i = 0; i < points.length; i++) {
      const point = points[i]!;
      const last = kept[kept.length - 1];
      const isEnd = i === points.length - 1;
      if (!last || isEnd || Math.hypot(point[0]! - last[0]!, point[1]! - last[1]!) >= MIN_SPACING_DEG) {
        kept.push(point);
      }
    }
    if (kept.length >= MIN_POINTS) {
      lines.push(kept.flatMap(([lon, lat]) => [Math.round(lon! * 10), Math.round(lat! * 10)]));
    }
  }
  return lines;
}
