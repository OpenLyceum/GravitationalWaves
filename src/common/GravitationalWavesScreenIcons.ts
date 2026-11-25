/**
 * GravitationalWavesScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each screen.
 * Drawn on the standard PhET 548 × 373 canvas using GravitationalWavesColors.
 * Replace the stub backgrounds with screen-specific motifs.
 */

import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import GravitationalWavesColors from "../GravitationalWavesColors.js";

const W = 548;
const H = 373;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: GravitationalWavesColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: GravitationalWavesColors.backgroundColorProperty,
  });
}

export function createWavesIcon(): ScreenIcon {
  return iconFrom(
    new Node({
      children: [background()],
    }),
  );
}

export function createInterferometerIcon(): ScreenIcon {
  return iconFrom(
    new Node({
      children: [background()],
    }),
  );
}

export function createChirpIcon(): ScreenIcon {
  return iconFrom(
    new Node({
      children: [background()],
    }),
  );
}

/** Small equirectangular globe with three detector dots and a delay-ring arc. */
export function createNetworkIcon(): ScreenIcon {
  const mapLeft = 74;
  const mapTop = 70;
  const mapW = 400;
  const mapH = 200;
  const ocean = new Rectangle(mapLeft, mapTop, mapW, mapH, {
    cornerRadius: 8,
    fill: GravitationalWavesColors.networkOceanColorProperty,
    stroke: GravitationalWavesColors.networkCoastColorProperty,
    lineWidth: 2,
  });
  // Simple land blobs (schematic).
  const land = new Path(
    new Shape()
      .ellipse(mapLeft + 120, mapTop + 90, 55, 40, 0)
      .ellipse(mapLeft + 280, mapTop + 85, 70, 45, 0)
      .ellipse(mapLeft + 200, mapTop + 150, 40, 20, 0),
    {
      fill: GravitationalWavesColors.networkCoastColorProperty,
      opacity: 0.55,
    },
  );
  const ring = new Path(new Shape().ellipticalArc(mapLeft + 200, mapTop + 100, 130, 70, 0, -0.8, 2.2, false), {
    stroke: GravitationalWavesColors.networkRingColorProperty,
    lineWidth: 4,
    lineDash: [10, 8],
  });
  const dots = [
    { x: mapLeft + 90, y: mapTop + 70, fill: GravitationalWavesColors.networkH1ColorProperty },
    { x: mapLeft + 140, y: mapTop + 110, fill: GravitationalWavesColors.networkL1ColorProperty },
    { x: mapLeft + 310, y: mapTop + 80, fill: GravitationalWavesColors.networkV1ColorProperty },
  ].map(
    (d) =>
      new Circle(10, {
        fill: d.fill,
        centerX: d.x,
        centerY: d.y,
        stroke: GravitationalWavesColors.textColorProperty,
        lineWidth: 1,
      }),
  );
  const equator = new Line(mapLeft + 10, mapTop + mapH / 2, mapLeft + mapW - 10, mapTop + mapH / 2, {
    stroke: GravitationalWavesColors.networkGridColorProperty,
    lineWidth: 1,
  });
  return iconFrom(
    new Node({
      children: [background(), ocean, land, equator, ring, ...dots],
    }),
  );
}
