/**
 * StripChart.ts
 *
 * Simple scrolling line chart driven by a RingBuffer (strain / power strips).
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Line, Node, Path, Rectangle, RichText, Text } from "scenerystack/scenery";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import type { RingBuffer } from "../model/RingBuffer.js";
import { SMALL_FONT } from "./GravitationalWavesFonts.js";

export class StripChart extends Node {
  private readonly plotWidth: number;
  private readonly plotHeight: number;
  private readonly buffer: RingBuffer;
  private readonly windowSamples: () => number;
  private readonly ySpan: () => number;
  private readonly trace: Path;
  private readonly zeroLine: Line | null;
  private readonly scaleReadout: RichText | null;
  private readonly scaleFormatter: ((span: number) => string) | null;
  /** Most recent auto-scale half-span (for callers that show a full-scale label). */
  public lastYSpan = 1;

  public constructor(
    buffer: RingBuffer,
    options: {
      readonly width: number;
      readonly height: number;
      readonly title: TReadOnlyProperty<string>;
      readonly windowSamples: () => number;
      readonly ySpan: () => number;
      readonly stroke: TReadOnlyProperty<unknown>;
      /** Optional vertical-axis label (drawn rotated on the left). */
      readonly yLabel?: TReadOnlyProperty<string>;
      /** Draw a horizontal zero line through the plot mid-height. */
      readonly showZeroLine?: boolean;
      /** Left inset reserved for a y-axis label (default 8, or 28 with yLabel). */
      readonly leftGutter?: number;
      /**
       * Optional full-scale caption formatter. Called each update with the
       * effective half-span; return RichText markup (or "" to hide).
       */
      readonly scaleFormatter?: (span: number) => string;
    },
  ) {
    super({ pickable: false });
    this.buffer = buffer;
    this.windowSamples = options.windowSamples;
    this.ySpan = options.ySpan;
    this.scaleFormatter = options.scaleFormatter ?? null;

    const hasYLabel = Boolean(options.yLabel);
    const left = options.leftGutter ?? (hasYLabel ? 28 : 8);
    const top = 22;
    const bottom = options.scaleFormatter ? 20 : 8;
    const right = 8;
    this.plotWidth = options.width - left - right;
    this.plotHeight = options.height - top - bottom;

    const backing = new Rectangle(0, 0, options.width, options.height, {
      cornerRadius: 4,
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });
    const title = new Text(options.title, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      left: left,
      top: 4,
      maxWidth: options.width - left - 8,
    });
    this.trace = new Path(null, {
      stroke: options.stroke as never,
      lineWidth: 1.5,
    });
    this.zeroLine = options.showZeroLine
      ? new Line(0, this.plotHeight / 2, this.plotWidth, this.plotHeight / 2, {
          stroke: GravitationalWavesColors.chartGridColorProperty,
          lineWidth: 1,
        })
      : null;

    const plotChildren: Node[] = [
      new Rectangle(0, 0, this.plotWidth, this.plotHeight, {
        stroke: GravitationalWavesColors.chartGridColorProperty,
      }),
    ];
    if (this.zeroLine) {
      plotChildren.push(this.zeroLine);
    }
    plotChildren.push(this.trace);

    const plot = new Node({
      x: left,
      y: top,
      clipArea: Shape.rectangle(0, 0, this.plotWidth, this.plotHeight),
      children: plotChildren,
    });

    const children: Node[] = [backing, title, plot];

    if (options.yLabel) {
      const yLabel = new Text(options.yLabel, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.mutedTextColorProperty,
        rotation: -Math.PI / 2,
        maxWidth: this.plotHeight - 4,
      });
      yLabel.centerX = 10;
      yLabel.centerY = top + this.plotHeight / 2;
      children.push(yLabel);
    }

    this.scaleReadout = options.scaleFormatter
      ? new RichText("", {
          font: SMALL_FONT,
          fill: GravitationalWavesColors.mutedTextColorProperty,
          left: left,
          bottom: options.height - 2,
          maxWidth: options.width - left - 8,
        })
      : null;
    if (this.scaleReadout) {
      children.push(this.scaleReadout);
    }

    this.children = children;
  }

  /** Redraw from the newest sample at the right edge. */
  public update(): void {
    const count = Math.min(this.windowSamples(), this.buffer.length);
    if (count < 2) {
      this.trace.shape = null;
      return;
    }
    const span = Math.max(this.ySpan(), 1e-30);
    this.lastYSpan = span;
    if (this.scaleReadout && this.scaleFormatter) {
      this.scaleReadout.string = this.scaleFormatter(span);
    }
    const shape = new Shape();
    for (let age = count - 1; age >= 0; age--) {
      const x = ((count - 1 - age) / (count - 1)) * this.plotWidth;
      const y = this.plotHeight / 2 - (this.buffer.atAge(age) / span) * (this.plotHeight * 0.45);
      if (age === count - 1) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    this.trace.shape = shape;
  }
}
