/**
 * SnrScanChart.ts
 *
 * Log-x SNR-vs-template-chirp-mass plot with a true-ℳ marker.
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { ChartRectangle, ChartTransform } from "scenerystack/bamboo";
import { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Line, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import type { SnrScanResult } from "../../common/model/MatchedFilter.js";
import { SMALL_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";

export class SnrScanChart extends Node {
  private readonly chartTransform: ChartTransform;
  private readonly curve: Path;
  private readonly marker: Line;
  private readonly plotWidth: number;
  private readonly plotHeight: number;

  public constructor(options: {
    readonly width: number;
    readonly height: number;
    readonly title: TReadOnlyProperty<string>;
    readonly xLabel: TReadOnlyProperty<string>;
    readonly yLabel: TReadOnlyProperty<string>;
  }) {
    super({ pickable: false });

    const gutterLeft = 32;
    const gutterTop = 20;
    const right = 8;
    const bottom = 24;
    this.plotWidth = options.width - gutterLeft - right;
    this.plotHeight = options.height - gutterTop - bottom;

    this.chartTransform = new ChartTransform({
      viewWidth: this.plotWidth,
      viewHeight: this.plotHeight,
      modelXRange: new Range(Math.log10(0.8), Math.log10(90)),
      modelYRange: new Range(0, 10),
    });

    const backing = new Rectangle(0, 0, options.width, options.height, {
      cornerRadius: 4,
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });
    const title = new Text(options.title, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      left: gutterLeft,
      top: 3,
      maxWidth: this.plotWidth,
    });
    const background = new ChartRectangle(this.chartTransform, {
      fill: null,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });
    background.left = gutterLeft;
    background.top = gutterTop;

    this.curve = new Path(null, {
      stroke: GravitationalWavesColors.chirpSnrScanColorProperty,
      lineWidth: 1.5,
      // Translate rather than set left/top: the shape is empty until the first scan.
      x: gutterLeft,
      y: gutterTop,
    });

    this.marker = new Line(0, 0, 0, this.plotHeight, {
      stroke: GravitationalWavesColors.chirpTrueMcColorProperty,
      lineWidth: 1.5,
      lineDash: [4, 3],
      visible: false,
      x: gutterLeft,
      y: gutterTop,
    });

    const xLabel = new Text(options.xLabel, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      centerX: gutterLeft + this.plotWidth / 2,
      bottom: options.height - 2,
      maxWidth: this.plotWidth,
    });
    const yLabel = new Text(options.yLabel, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      rotation: -Math.PI / 2,
      maxWidth: this.plotHeight,
    });
    yLabel.centerX = 10;
    yLabel.centerY = gutterTop + this.plotHeight / 2;

    this.children = [backing, title, background, this.curve, this.marker, xLabel, yLabel];
  }

  public update(scan: SnrScanResult, trueMc: number): void {
    if (scan.mcTemplate.length < 2) {
      this.curve.shape = null;
      this.marker.visible = false;
      return;
    }

    let snrMax = 1;
    for (const value of scan.snr) {
      snrMax = Math.max(snrMax, value);
    }
    const mc0 = scan.mcTemplate[0] ?? 0.8;
    const mc1 = scan.mcTemplate[scan.mcTemplate.length - 1] ?? 90;
    this.chartTransform.setModelXRange(new Range(Math.log10(mc0), Math.log10(mc1)));
    this.chartTransform.setModelYRange(new Range(0, snrMax * 1.1));

    const shape = new Shape();
    for (let i = 0; i < scan.mcTemplate.length; i++) {
      const mc = scan.mcTemplate[i] ?? mc0;
      const snr = scan.snr[i] ?? 0;
      const x = this.chartTransform.modelToViewX(Math.log10(mc));
      const y = this.chartTransform.modelToViewY(snr);
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    this.curve.shape = shape;

    if (trueMc > 0) {
      const x = this.chartTransform.modelToViewX(Math.log10(trueMc));
      this.marker.x1 = x;
      this.marker.x2 = x;
      this.marker.visible = true;
    } else {
      this.marker.visible = false;
    }
  }
}
