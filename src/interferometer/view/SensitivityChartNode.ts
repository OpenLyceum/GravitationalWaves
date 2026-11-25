/**
 * SensitivityChartNode.ts
 *
 * Log–log ASD chart: toy noise terms, total, optional LIGO H1 overlay, legend.
 */
import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { ChartRectangle, ChartTransform } from "scenerystack/bamboo";
import { Range, toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { StringUtils } from "scenerystack/phetcommon";
import { Line, Node, Path, Rectangle, RichText, Text } from "scenerystack/scenery";
import { LABEL_FONT, SMALL_FONT } from "../../common/view/GravitationalWavesFonts.js";
import { formatScientific } from "../../common/view/scientificFormat.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { ASD_FREQ_MAX, ASD_FREQ_MIN, ASD_MAX, ASD_MIN } from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { InterferometerModel } from "../model/InterferometerModel.js";

function logPoints(f: Float64Array | readonly number[], asd: Float64Array | readonly number[]): Vector2[] {
  const points: Vector2[] = [];
  const n = Math.min(f.length, asd.length);
  for (let i = 0; i < n; i++) {
    const fi = f[i];
    const ai = asd[i];
    if (fi !== undefined && ai !== undefined && fi > 0 && ai > 0) {
      points.push(new Vector2(Math.log10(fi), Math.log10(ai)));
    }
  }
  return points;
}

function shapeFrom(transform: ChartTransform, points: Vector2[]): Shape | null {
  if (points.length < 2) {
    return null;
  }
  const shape = new Shape();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p) {
      continue;
    }
    const x = transform.modelToViewX(p.x);
    const y = transform.modelToViewY(p.y);
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  return shape;
}

/** Colour-blind-friendly dash patterns (distinct even in greyscale). */
const DASH_SEISMIC = [6, 4];
const DASH_THERMAL = [2, 3];
const DASH_SHOT = [8, 3, 2, 3];

export class SensitivityChartNode extends Node {
  private readonly disposeChart: () => void;

  public constructor(model: InterferometerModel, width: number, height: number) {
    super({ pickable: false });
    const strings = StringManager.getInstance().getInterferometerStrings();

    const left = 52;
    const right = 12;
    const top = 28;
    const bottom = 48;
    const plotW = width - left - right;
    const plotH = height - top - bottom;

    const transform = new ChartTransform({
      viewWidth: plotW,
      viewHeight: plotH,
      modelXRange: new Range(Math.log10(ASD_FREQ_MIN), Math.log10(ASD_FREQ_MAX)),
      modelYRange: new Range(Math.log10(ASD_MIN), Math.log10(ASD_MAX)),
    });

    const backing = new Rectangle(0, 0, width, height, {
      cornerRadius: 4,
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });
    const title = new Text(strings.sensitivityTitleStringProperty, {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      left: left,
      top: 6,
      maxWidth: plotW,
    });
    const background = new ChartRectangle(transform, {
      fill: null,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });

    const seismicPlot = new Path(null, {
      stroke: GravitationalWavesColors.seismicNoiseColorProperty,
      lineWidth: 1.2,
      lineDash: DASH_SEISMIC,
    });
    const thermalPlot = new Path(null, {
      stroke: GravitationalWavesColors.thermalNoiseColorProperty,
      lineWidth: 1.2,
      lineDash: DASH_THERMAL,
    });
    const shotPlot = new Path(null, {
      stroke: GravitationalWavesColors.shotNoiseColorProperty,
      lineWidth: 1.2,
      lineDash: DASH_SHOT,
    });
    const totalPlot = new Path(null, {
      stroke: GravitationalWavesColors.totalNoiseColorProperty,
      lineWidth: 2.5,
    });
    const ligoPlot = new Path(null, {
      stroke: GravitationalWavesColors.ligoAsdColorProperty,
      lineWidth: 1.5,
    });
    const band = new Rectangle(0, 0, 0, 0, {
      fill: GravitationalWavesColors.sensitiveBandColorProperty,
    });
    const bandLabel = new Text(strings.sensitiveBandStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.accentColorProperty,
      maxWidth: 110,
    });

    const bestText = new RichText("", {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: plotW,
    });

    const legend = buildLegend(strings);
    legend.right = plotW - 4;
    legend.top = 4;

    // Power-of-ten tick labels
    const tickLabels = new Node();
    for (const exp of [1, 2, 3]) {
      const x = transform.modelToViewX(exp);
      tickLabels.addChild(
        new Text(`10${toSuperscript(exp)}`, {
          font: SMALL_FONT,
          fill: GravitationalWavesColors.mutedTextColorProperty,
          centerX: x,
          top: plotH + 4,
        }),
      );
    }
    for (const exp of [-25, -23, -21, -19]) {
      const y = transform.modelToViewY(exp);
      tickLabels.addChild(
        new Text(`10${toSuperscript(exp)}`, {
          font: SMALL_FONT,
          fill: GravitationalWavesColors.mutedTextColorProperty,
          right: -4,
          centerY: y,
        }),
      );
    }

    const plotLayer = new Node({
      x: left,
      y: top,
      clipArea: Shape.rectangle(0, 0, plotW, plotH),
      children: [background, band, seismicPlot, thermalPlot, shotPlot, totalPlot, ligoPlot, bandLabel, legend],
    });
    tickLabels.x = left;
    tickLabels.y = top;

    const xAxis = new Text(strings.freqAxisStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      centerX: left + plotW / 2,
      top: top + plotH + 16,
      maxWidth: plotW,
    });
    const yAxis = new Text(strings.asdAxisStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      rotation: -Math.PI / 2,
      centerY: top + plotH / 2,
      centerX: 12,
      maxWidth: plotH - 20,
    });
    bestText.left = left;
    bestText.bottom = height - 2;

    this.children = [backing, title, plotLayer, tickLabels, xAxis, yAxis, bestText];

    const redraw = () => {
      const curves = model.noiseCurves();
      seismicPlot.shape = model.seismicEnabledProperty.value
        ? shapeFrom(transform, logPoints(curves.f, curves.seismic))
        : null;
      thermalPlot.shape = model.thermalEnabledProperty.value
        ? shapeFrom(transform, logPoints(curves.f, curves.thermal))
        : null;
      shotPlot.shape = model.shotEnabledProperty.value ? shapeFrom(transform, logPoints(curves.f, curves.shot)) : null;
      totalPlot.shape = shapeFrom(transform, logPoints(curves.f, curves.total));

      ligoPlot.visible = model.showRealCurveProperty.value;
      legend.setLigoVisible(model.showRealCurveProperty.value);
      if (model.showRealCurveProperty.value) {
        ligoPlot.shape = shapeFrom(transform, logPoints(model.ligoAsd.f, model.ligoAsd.asd));
      }

      const best = model.bestSensitivity();
      const logF = Math.log10(best.frequency);
      const x = transform.modelToViewX(logF);
      band.rectX = x - 18;
      band.rectY = 0;
      band.rectWidth = 36;
      band.rectHeight = plotH;
      // Band label inside the highlight, near the bottom — clear of the top-right legend.
      bandLabel.centerX = x;
      bandLabel.bottom = plotH - 14;

      bestText.string = StringUtils.fillIn(strings.bestSensitivityStringProperty.value, {
        value: formatScientific(best.asd, 1),
        freq: toFixed(best.frequency, 0),
      });
    };

    const multilink = Multilink.multilink(
      [
        model.armLengthKmProperty,
        model.fabryPerotProperty,
        model.laserPowerProperty,
        model.seismicEnabledProperty,
        model.thermalEnabledProperty,
        model.shotEnabledProperty,
        model.showRealCurveProperty,
        strings.bestSensitivityStringProperty,
      ],
      redraw,
    );

    this.disposeChart = () => {
      multilink.dispose();
      const children = this.children.slice();
      for (const child of children) {
        if (!child.isDisposed) {
          child.disposeSubtree();
        }
      }
      transform.dispose();
    };
  }

  public override dispose(): void {
    this.disposeChart();
    super.dispose();
  }
}

type LegendStrings = {
  readonly legendSeismicStringProperty: TReadOnlyProperty<string>;
  readonly legendThermalStringProperty: TReadOnlyProperty<string>;
  readonly legendShotStringProperty: TReadOnlyProperty<string>;
  readonly legendTotalStringProperty: TReadOnlyProperty<string>;
  readonly ligoCurveLabelStringProperty: TReadOnlyProperty<string>;
};

function buildLegend(strings: LegendStrings): Node & { setLigoVisible: (v: boolean) => void } {
  const row = (
    label: TReadOnlyProperty<string>,
    stroke: unknown,
    lineWidth: number,
    lineDash?: number[],
  ): { readonly node: Node } => {
    const sample = new Line(0, 0, 18, 0, {
      stroke: stroke as never,
      lineWidth,
      lineDash: lineDash ?? [],
    });
    const text = new Text(label, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: 110,
    });
    text.left = sample.right + 4;
    text.centerY = sample.centerY;
    return { node: new Node({ children: [sample, text] }) };
  };

  const seismic = row(
    strings.legendSeismicStringProperty,
    GravitationalWavesColors.seismicNoiseColorProperty,
    1.2,
    DASH_SEISMIC,
  );
  const thermal = row(
    strings.legendThermalStringProperty,
    GravitationalWavesColors.thermalNoiseColorProperty,
    1.2,
    DASH_THERMAL,
  );
  const shot = row(strings.legendShotStringProperty, GravitationalWavesColors.shotNoiseColorProperty, 1.2, DASH_SHOT);
  const total = row(strings.legendTotalStringProperty, GravitationalWavesColors.totalNoiseColorProperty, 2);
  const ligo = row(strings.ligoCurveLabelStringProperty, GravitationalWavesColors.ligoAsdColorProperty, 1.5);

  const entries = [seismic, thermal, shot, total, ligo];
  let y = 0;
  for (const entry of entries) {
    entry.node.top = y;
    y = entry.node.bottom + 2;
  }

  const node = new Node({ children: entries.map((e) => e.node) }) as Node & {
    setLigoVisible: (v: boolean) => void;
  };
  node.setLigoVisible = (v: boolean) => {
    ligo.node.visible = v;
  };
  return node;
}

function toSuperscript(n: number): string {
  const map: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "-": "⁻",
  };
  return String(n)
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}
