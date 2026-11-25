/**
 * SkyMapNode.ts
 *
 * Equirectangular Earth map with posterior heat map, delay rings, detector markers,
 * and a draggable true-source star.
 */
import { DerivedProperty, Multilink, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, roundSymmetric, toFixed, type Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { ModelViewTransform2, StringUtils } from "scenerystack/phetcommon";
import {
  Color,
  DragListener,
  Image,
  KeyboardDragListener,
  Line,
  Node,
  Path,
  PressListener,
  Rectangle,
  Text,
  VBox,
} from "scenerystack/scenery";
import { Panel } from "scenerystack/sun";
import { COASTLINES } from "../../common/data/generated/coastlines.js";
import { DETECTOR_IDS, DETECTOR_SITES } from "../../common/model/DetectorNetwork.js";
import { delayRing, SKY_GRID_HEIGHT, SKY_GRID_STEP_DEG, SKY_GRID_WIDTH } from "../../common/model/SkyLocalization.js";
import { LABEL_FONT, SMALL_FONT, TITLE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  NETWORK_ARRIVAL_FLASH_FRACTION,
  NETWORK_MAP_HEIGHT,
  NETWORK_MAP_WIDTH,
  NETWORK_SOURCE_DRAG_DELTA_DEG,
  NETWORK_SOURCE_SHIFT_DRAG_DELTA_DEG,
  NETWORK_TRACE_END_S,
  NETWORK_TRACE_START_S,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import { type NetworkModel, networkDetector, SKY_BOUNDS } from "../model/NetworkModel.js";
import { detectorColorProperty } from "./networkDetectorColors.js";

const DEG = Math.PI / 180;
const MAP_LEFT = 36;
const MAP_TOP = 36;
const ARM_LENGTH_PX = 10;

const MAP_VIEW_BOUNDS = new Bounds2(MAP_LEFT, MAP_TOP, MAP_LEFT + NETWORK_MAP_WIDTH, MAP_TOP + NETWORK_MAP_HEIGHT);

/** Lon (−180..180) / lat (−90..90) → map pixels (north at top). */
const MAP_TRANSFORM = ModelViewTransform2.createRectangleInvertedYMapping(SKY_BOUNDS, MAP_VIEW_BOUNDS);

function parseColor(property: TReadOnlyProperty<unknown>): Color {
  const v = property.value;
  if (v instanceof Color) {
    return v;
  }
  return new Color(String(v));
}

function starShape(size: number): Shape {
  const shape = new Shape();
  for (let i = 0; i < 5; i++) {
    const outer = -Math.PI / 2 + (2 * Math.PI * i) / 5;
    const inner = outer + Math.PI / 5;
    const ox = size * Math.cos(outer);
    const oy = size * Math.sin(outer);
    const ix = size * 0.45 * Math.cos(inner);
    const iy = size * 0.45 * Math.sin(inner);
    if (i === 0) {
      shape.moveTo(ox, oy);
    } else {
      shape.lineTo(ox, oy);
    }
    shape.lineTo(ix, iy);
  }
  return shape.close();
}

/** Split a ring where longitude jumps across the antimeridian. */
function splitAntimeridian(points: ReadonlyArray<{ readonly lon: number; readonly lat: number }>): Vector2[][] {
  const segments: Vector2[][] = [];
  let current: Vector2[] = [];
  let prevLonDeg: number | null = null;
  for (const point of points) {
    const lonDeg = point.lon / DEG;
    const latDeg = point.lat / DEG;
    if (prevLonDeg !== null && Math.abs(lonDeg - prevLonDeg) > 180) {
      if (current.length > 1) {
        segments.push(current);
      }
      current = [];
    }
    current.push(MAP_TRANSFORM.modelToViewXY(lonDeg, latDeg));
    prevLonDeg = lonDeg;
  }
  if (current.length > 1) {
    segments.push(current);
  }
  return segments;
}

export class SkyMapNode extends Node {
  private readonly heatCanvas: HTMLCanvasElement;
  private readonly heatImage: Image;
  private readonly ringLayer: Node;
  private readonly detectorLayer: Node;
  private readonly peakMarker: Path;
  private readonly star: Path;
  private readonly noteText: Text;
  private readonly skyBoundsProperty: Property<Bounds2>;
  private readonly disposeNode: () => void;

  public constructor(model: NetworkModel) {
    super();
    const strings = StringManager.getInstance().getNetworkStrings();
    const a11y = StringManager.getInstance().getNetworkA11yStrings();

    const title = new Text(strings.mapTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: NETWORK_MAP_WIDTH + MAP_LEFT,
      left: 0,
      top: 0,
    });
    const caption = new Text(strings.mapCaptionStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: NETWORK_MAP_WIDTH + MAP_LEFT,
      left: 0,
      top: 18,
    });

    const ocean = new Rectangle(MAP_LEFT, MAP_TOP, NETWORK_MAP_WIDTH, NETWORK_MAP_HEIGHT, {
      fill: GravitationalWavesColors.networkOceanColorProperty,
      cursor: "crosshair",
    });
    const border = new Rectangle(MAP_LEFT, MAP_TOP, NETWORK_MAP_WIDTH, NETWORK_MAP_HEIGHT, {
      stroke: GravitationalWavesColors.chartBorderColorProperty,
      lineWidth: 1,
      pickable: false,
    });

    this.heatCanvas = document.createElement("canvas");
    this.heatCanvas.width = SKY_GRID_WIDTH;
    this.heatCanvas.height = SKY_GRID_HEIGHT;
    this.heatImage = new Image(this.heatCanvas, {
      left: MAP_LEFT,
      top: MAP_TOP,
      pickable: false,
    });
    this.heatImage.setScaleMagnitude(NETWORK_MAP_WIDTH / SKY_GRID_WIDTH, NETWORK_MAP_HEIGHT / SKY_GRID_HEIGHT);

    const gridLayer = new Node({ pickable: false });
    const gridStepDeg = 30 * SKY_GRID_STEP_DEG;
    for (let lon = -180; lon <= 180; lon += gridStepDeg) {
      const x = MAP_TRANSFORM.modelToViewX(lon);
      gridLayer.addChild(
        new Line(x, MAP_TOP, x, MAP_TOP + NETWORK_MAP_HEIGHT, {
          stroke: GravitationalWavesColors.networkGridColorProperty,
          lineWidth: 0.5,
        }),
      );
      if (lon > -180 && lon < 180) {
        gridLayer.addChild(
          new Text(`${lon}°`, {
            font: SMALL_FONT,
            fill: GravitationalWavesColors.mutedTextColorProperty,
            centerX: x,
            top: MAP_TOP + NETWORK_MAP_HEIGHT + 2,
            maxWidth: 36,
          }),
        );
      }
    }
    for (let lat = -90; lat <= 90; lat += gridStepDeg) {
      const y = MAP_TRANSFORM.modelToViewY(lat);
      gridLayer.addChild(
        new Line(MAP_LEFT, y, MAP_LEFT + NETWORK_MAP_WIDTH, y, {
          stroke: GravitationalWavesColors.networkGridColorProperty,
          lineWidth: 0.5,
        }),
      );
      if (lat > -90 && lat < 90) {
        gridLayer.addChild(
          new Text(`${lat}°`, {
            font: SMALL_FONT,
            fill: GravitationalWavesColors.mutedTextColorProperty,
            right: MAP_LEFT - 4,
            centerY: y,
            maxWidth: 32,
          }),
        );
      }
    }

    const coastLayer = new Node({ pickable: false });
    for (const line of COASTLINES) {
      if (line.length < 4) {
        continue;
      }
      const shape = new Shape();
      for (let i = 0; i + 1 < line.length; i += 2) {
        const lon = (line[i] ?? 0) / 10;
        const lat = (line[i + 1] ?? 0) / 10;
        const p = MAP_TRANSFORM.modelToViewXY(lon, lat);
        if (i === 0) {
          shape.moveToPoint(p);
        } else {
          shape.lineToPoint(p);
        }
      }
      coastLayer.addChild(
        new Path(shape, {
          stroke: GravitationalWavesColors.networkCoastColorProperty,
          lineWidth: 0.8,
        }),
      );
    }

    this.ringLayer = new Node({ pickable: false });
    this.detectorLayer = new Node({ pickable: false });

    this.peakMarker = new Path(new Shape().moveTo(-5, 0).lineTo(5, 0).moveTo(0, -5).lineTo(0, 5), {
      stroke: GravitationalWavesColors.networkPeakColorProperty,
      lineWidth: 2,
      pickable: false,
    });

    const positionDescriptionProperty = new DerivedProperty(
      [
        model.sourcePositionProperty,
        strings.sourcePositionValueStringProperty,
        strings.lonEastStringProperty,
        strings.lonWestStringProperty,
        strings.latNorthStringProperty,
        strings.latSouthStringProperty,
      ],
      (pos, pattern, lonEast, lonWest, latNorth, latSouth) => {
        const lonAbs = Math.abs(pos.x);
        const latAbs = Math.abs(pos.y);
        const lonStr = StringUtils.fillIn(pos.x >= 0 ? lonEast : lonWest, { value: toFixed(lonAbs, 0) });
        const latStr = StringUtils.fillIn(pos.y >= 0 ? latNorth : latSouth, { value: toFixed(latAbs, 0) });
        return StringUtils.fillIn(pattern, { lon: lonStr, lat: latStr });
      },
    );

    // Outline only, so a small 90 % region under the source stays visible.
    this.star = new Path(starShape(9), {
      stroke: GravitationalWavesColors.networkTruthColorProperty,
      lineWidth: 2,
      mouseArea: starShape(9).bounds.dilated(4),
      touchArea: starShape(9).bounds.dilated(8),
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: a11y.controls.sourcePositionStringProperty,
      accessibleHelpText: positionDescriptionProperty,
    });

    this.skyBoundsProperty = new Property(SKY_BOUNDS);
    const dragListener = new DragListener({
      positionProperty: model.sourcePositionProperty,
      transform: MAP_TRANSFORM,
      dragBoundsProperty: this.skyBoundsProperty,
    });
    this.star.addInputListener(dragListener);

    const keyboardDragListener = new KeyboardDragListener({
      positionProperty: model.sourcePositionProperty,
      transform: MAP_TRANSFORM,
      dragBoundsProperty: this.skyBoundsProperty,
      dragDelta: NETWORK_SOURCE_DRAG_DELTA_DEG,
      shiftDragDelta: NETWORK_SOURCE_SHIFT_DRAG_DELTA_DEG,
    });
    this.star.addInputListener(keyboardDragListener);

    const mapPress = new PressListener({
      press: (event) => {
        const local = this.globalToLocalPoint(event.pointer.point);
        model.sourcePositionProperty.value = MAP_TRANSFORM.viewToModelPosition(local);
      },
    });
    ocean.addInputListener(mapPress);

    this.noteText = new Text("", {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: NETWORK_MAP_WIDTH - 40,
      centerX: MAP_LEFT + NETWORK_MAP_WIDTH / 2,
      centerY: MAP_TOP + NETWORK_MAP_HEIGHT / 2,
      pickable: false,
    });

    const legendText = (stringProperty: TReadOnlyProperty<string>) =>
      new Text(stringProperty, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.mutedTextColorProperty,
        maxWidth: 170,
      });
    const legendBox = new VBox({
      align: "left",
      spacing: 1,
      children: [
        legendText(strings.legendTrueStringProperty),
        legendText(strings.legendPeakStringProperty),
        legendText(strings.legendRegionStringProperty),
        legendText(strings.legendRingStringProperty),
      ],
    });
    const legend = new Panel(legendBox, {
      pickable: false,
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: null,
      opacity: 0.85,
      xMargin: 4,
      yMargin: 3,
      cornerRadius: 3,
    });
    legendBox.boundsProperty.link(() => {
      legend.left = MAP_LEFT + 4;
      legend.bottom = MAP_TOP + NETWORK_MAP_HEIGHT - 4;
    });

    this.children = [
      title,
      caption,
      ocean,
      this.heatImage,
      gridLayer,
      coastLayer,
      this.ringLayer,
      this.detectorLayer,
      this.peakMarker,
      this.star,
      this.noteText,
      legend,
      border,
    ];

    const multilink = Multilink.multilinkAny(
      [
        model.skyMapProperty,
        model.pairsProperty,
        model.readingsProperty,
        model.sourcePositionProperty,
        model.showRingsProperty,
        model.showTruthProperty,
        model.truthKnownProperty,
        model.playheadProperty,
        model.detectorEnabledProperties.H1,
        model.detectorEnabledProperties.L1,
        model.detectorEnabledProperties.V1,
        model.detectorEnabledProperties.K1,
        GravitationalWavesColors.networkHeatColorProperty,
        GravitationalWavesColors.networkHeat90ColorProperty,
        strings.oneDetectorNoteStringProperty,
        strings.noDetectorNoteStringProperty,
        strings.ringLabelStringProperty,
      ],
      () => this.redraw(model, strings),
    );

    const starLink = Multilink.multilink(
      [model.sourcePositionProperty, model.truthKnownProperty, model.showTruthProperty],
      (pos, known, show) => {
        this.star.center = MAP_TRANSFORM.modelToViewPosition(pos);
        this.star.visible = known && show;
      },
    );

    this.disposeNode = () => {
      multilink.dispose();
      starLink.dispose();
      positionDescriptionProperty.dispose();
      this.skyBoundsProperty.dispose();
      this.star.removeInputListener(dragListener);
      this.star.removeInputListener(keyboardDragListener);
      ocean.removeInputListener(mapPress);
      dragListener.dispose();
      keyboardDragListener.dispose();
      mapPress.dispose();
      const children = this.children.slice();
      for (const child of children) {
        if (!child.isDisposed) {
          child.disposeSubtree();
        }
      }
    };
  }

  public override dispose(): void {
    this.disposeNode();
    super.dispose();
  }

  private redraw(model: NetworkModel, strings: ReturnType<StringManager["getNetworkStrings"]>): void {
    const enabled = model.enabledDetectors();
    this.paintHeat(model);
    this.rebuildRings(model, strings);
    this.rebuildDetectors(model);

    const map = model.skyMapProperty.value;
    if (enabled.length >= 3 && map.density.length > 0) {
      this.peakMarker.center = MAP_TRANSFORM.modelToViewXY(map.peakLon / DEG, map.peakLat / DEG);
      this.peakMarker.visible = true;
    } else {
      this.peakMarker.visible = false;
    }

    if (enabled.length === 0) {
      this.noteText.string = strings.noDetectorNoteStringProperty.value;
      this.noteText.visible = true;
    } else if (enabled.length === 1) {
      this.noteText.string = strings.oneDetectorNoteStringProperty.value;
      this.noteText.visible = true;
    } else {
      this.noteText.visible = false;
    }
  }

  private paintHeat(model: NetworkModel): void {
    const map = model.skyMapProperty.value;
    const ctx = this.heatCanvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const img = ctx.createImageData(SKY_GRID_WIDTH, SKY_GRID_HEIGHT);
    const warm = parseColor(GravitationalWavesColors.networkHeatColorProperty);
    const hot = parseColor(GravitationalWavesColors.networkHeat90ColorProperty);
    const threshold = map.threshold90;
    if (map.density.length === SKY_GRID_WIDTH * SKY_GRID_HEIGHT) {
      for (let row = 0; row < SKY_GRID_HEIGHT; row++) {
        for (let col = 0; col < SKY_GRID_WIDTH; col++) {
          const d = map.density[row * SKY_GRID_WIDTH + col] ?? 0;
          const idx = (row * SKY_GRID_WIDTH + col) * 4;
          if (d <= 0) {
            img.data[idx + 3] = 0;
            continue;
          }
          const in90 = threshold > 0 && d >= threshold;
          const c = in90 ? hot : warm;
          img.data[idx] = c.r;
          img.data[idx + 1] = c.g;
          img.data[idx + 2] = c.b;
          img.data[idx + 3] = Math.min(255, roundSymmetric(255 * Math.sqrt(d) * (in90 ? 0.95 : 0.7)));
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    this.heatImage.image = this.heatCanvas;
  }

  private rebuildRings(model: NetworkModel, strings: ReturnType<StringManager["getNetworkStrings"]>): void {
    this.ringLayer.removeAllChildren();
    if (!model.showRingsProperty.value) {
      return;
    }
    for (const pair of model.pairsProperty.value) {
      const points = delayRing(networkDetector(pair.a), networkDetector(pair.b), pair.delay);
      for (const segment of splitAntimeridian(points)) {
        if (segment.length < 2) {
          continue;
        }
        const shape = new Shape();
        segment.forEach((p, i) => {
          if (i === 0) {
            shape.moveToPoint(p);
          } else {
            shape.lineToPoint(p);
          }
        });
        this.ringLayer.addChild(
          new Path(shape, {
            stroke: GravitationalWavesColors.networkRingColorProperty,
            lineWidth: 1.5,
            lineDash: [6, 4],
          }),
        );
      }
      const mid = points[Math.floor(points.length / 4)];
      if (mid) {
        const p = MAP_TRANSFORM.modelToViewXY(mid.lon / DEG, mid.lat / DEG);
        const label = StringUtils.fillIn(strings.ringLabelStringProperty.value, {
          a: pair.a,
          b: pair.b,
        });
        this.ringLayer.addChild(
          new Text(label, {
            font: SMALL_FONT,
            fill: GravitationalWavesColors.networkRingColorProperty,
            left: p.x + 4,
            centerY: p.y,
            maxWidth: 48,
          }),
        );
      }
    }
  }

  private rebuildDetectors(model: NetworkModel): void {
    this.detectorLayer.removeAllChildren();
    const readings = model.readingsProperty.value;
    const playhead = model.playheadProperty.value;
    const span = NETWORK_TRACE_END_S - NETWORK_TRACE_START_S;
    const flashWindow = NETWORK_ARRIVAL_FLASH_FRACTION * span;

    for (const id of DETECTOR_IDS) {
      const site = DETECTOR_SITES[id];
      const center = MAP_TRANSFORM.modelToViewXY(site.longitudeDeg, site.latitudeDeg);
      const enabled = model.detectorEnabledProperties[id].value;
      const color = enabled ? detectorColorProperty(id) : GravitationalWavesColors.networkDetectorOffColorProperty;
      const reading = readings.find((r) => r.id === id);
      const flashing =
        enabled && reading !== undefined && playhead >= reading.arrival && playhead < reading.arrival + flashWindow;

      if (flashing) {
        this.detectorLayer.addChild(
          new Path(Shape.circle(0, 0, 12), {
            fill: GravitationalWavesColors.networkFlashColorProperty,
            center,
          }),
        );
      }

      this.drawArm(center, site.xArmAzimuthDeg, color);
      this.drawArm(center, site.yArmAzimuthDeg, color);

      this.detectorLayer.addChild(
        new Path(Shape.circle(0, 0, 5), {
          fill: enabled ? color : null,
          stroke: color,
          lineWidth: 1.5,
          center,
        }),
      );
      this.detectorLayer.addChild(
        new Text(id, {
          font: SMALL_FONT,
          fill: color,
          left: center.x + 7,
          bottom: center.y - 2,
          maxWidth: 24,
        }),
      );
    }
  }

  private drawArm(center: Vector2, azimuthDeg: number, color: TReadOnlyProperty<Color | string>): void {
    // Azimuth clockwise from north; map: east = +x, north = −y.
    const rad = azimuthDeg * DEG;
    const dx = ARM_LENGTH_PX * Math.sin(rad);
    const dy = -ARM_LENGTH_PX * Math.cos(rad);
    this.detectorLayer.addChild(
      new Line(center.x - dx, center.y - dy, center.x + dx, center.y + dy, {
        stroke: color,
        lineWidth: 1.5,
      }),
    );
  }
}
