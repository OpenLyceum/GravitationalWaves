/**
 * TimeSeriesPlot.ts
 *
 * Multi-trace time-series chart with an optional vertical playhead.
 * Traces are clipped to the plot rectangle; y-scale uses 10 % headroom.
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { ChartRectangle, ChartTransform } from "scenerystack/bamboo";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Line, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { SMALL_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";

export type TimeSeriesTrace = {
  readonly t: Float64Array | readonly number[];
  readonly y: Float64Array | readonly number[];
  readonly stroke: TReadOnlyProperty<unknown>;
  readonly lineWidth?: number;
  readonly visible?: boolean;
};

/** Nice tick step aiming for ~4–6 labels across `span`. */
function niceStep(span: number): number {
  if (!(span > 0 && Number.isFinite(span))) {
    return 1;
  }
  const raw = span / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const mantissa = raw / pow;
  if (mantissa <= 1) {
    return pow;
  }
  if (mantissa <= 2) {
    return 2 * pow;
  }
  if (mantissa <= 5) {
    return 5 * pow;
  }
  return 10 * pow;
}

function formatTick(value: number, step: number): string {
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return toFixed(value, decimals);
}

export class TimeSeriesPlot extends Node {
  private readonly chartTransform: ChartTransform;
  private readonly plotWidth: number;
  private readonly plotHeight: number;
  private readonly plotLayer: Node;
  private readonly tickLabels: Node;
  private readonly traces: Path[] = [];
  private readonly playhead: Line;
  private readonly showYTicks: boolean;
  private readonly gutterLeft: number;
  private readonly gutterTop: number;
  private xMin = -1;
  private xMax = 0.1;
  private yMin = -1;
  private yMax = 1;

  public constructor(options: {
    readonly width: number;
    readonly height: number;
    readonly title: TReadOnlyProperty<string>;
    readonly xLabel?: TReadOnlyProperty<string>;
    readonly yLabel?: TReadOnlyProperty<string>;
    readonly traceCount?: number;
    readonly showYTicks?: boolean;
  }) {
    super({ pickable: false });

    this.showYTicks = options.showYTicks ?? !!options.yLabel;
    this.gutterLeft = this.showYTicks ? (options.yLabel ? 66 : 40) : options.yLabel ? 48 : 12;
    const right = 10;
    this.gutterTop = 22;
    const bottom = options.xLabel ? 36 : 10;
    this.plotWidth = Math.max(40, options.width - this.gutterLeft - right);
    this.plotHeight = Math.max(40, options.height - this.gutterTop - bottom);

    this.chartTransform = new ChartTransform({
      viewWidth: this.plotWidth,
      viewHeight: this.plotHeight,
      modelXRange: new Range(this.xMin, this.xMax),
      modelYRange: new Range(this.yMin, this.yMax),
    });

    const backing = new Rectangle(0, 0, options.width, options.height, {
      cornerRadius: 4,
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });
    const title = new Text(options.title, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      left: this.gutterLeft,
      top: 4,
      maxWidth: options.width - this.gutterLeft - 8,
    });
    const background = new ChartRectangle(this.chartTransform, {
      fill: null,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });

    const zeroLine = new Line(0, this.plotHeight / 2, this.plotWidth, this.plotHeight / 2, {
      stroke: GravitationalWavesColors.chartGridColorProperty,
      lineWidth: 1,
    });

    this.playhead = new Line(0, 0, 0, this.plotHeight, {
      stroke: GravitationalWavesColors.chirpPlayheadColorProperty,
      lineWidth: 1,
      lineDash: [3, 3],
      visible: false,
    });

    const plotChildren: Node[] = [background, zeroLine];
    const count = options.traceCount ?? 4;
    for (let i = 0; i < count; i++) {
      const path = new Path(null, { lineWidth: 1.2 });
      this.traces.push(path);
      plotChildren.push(path);
    }
    plotChildren.push(this.playhead);

    this.plotLayer = new Node({
      x: this.gutterLeft,
      y: this.gutterTop,
      // Canvas clipping is reliable for thick stroked Paths.
      renderer: "canvas",
      children: plotChildren,
    });
    this.plotLayer.clipArea = Shape.bounds(new Bounds2(0, 0, this.plotWidth, this.plotHeight));

    this.tickLabels = new Node({ x: this.gutterLeft, y: this.gutterTop });

    const children: Node[] = [backing, title, this.plotLayer, this.tickLabels];

    if (options.yLabel) {
      const yLabel = new Text(options.yLabel, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.mutedTextColorProperty,
        rotation: -Math.PI / 2,
        maxWidth: this.plotHeight,
      });
      // Keep the full rotated string inside this node's local x≥0 so the screen
      // edge does not clip "h (10⁻²¹)".
      yLabel.left = 2;
      yLabel.centerY = this.gutterTop + this.plotHeight / 2;
      children.push(yLabel);
    }
    if (options.xLabel) {
      const xLabel = new Text(options.xLabel, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.mutedTextColorProperty,
        centerX: this.gutterLeft + this.plotWidth / 2,
        bottom: options.height - 2,
        maxWidth: this.plotWidth,
      });
      children.push(xLabel);
    }

    this.children = children;
  }

  public update(traces: readonly TimeSeriesTrace[], playheadT: number | null, yPad = 0.1): void {
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    let any = false;

    for (const trace of traces) {
      if (trace.visible === false) {
        continue;
      }
      const n = Math.min(trace.t.length, trace.y.length);
      for (let i = 0; i < n; i++) {
        const t = trace.t[i];
        const y = trace.y[i];
        if (t === undefined || y === undefined || !Number.isFinite(t) || !Number.isFinite(y)) {
          continue;
        }
        any = true;
        xMin = Math.min(xMin, t);
        xMax = Math.max(xMax, t);
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
    }

    if (!any) {
      for (const path of this.traces) {
        path.shape = null;
        path.visible = false;
      }
      this.playhead.visible = false;
      this.tickLabels.removeAllChildren();
      return;
    }

    if (xMax <= xMin) {
      xMax = xMin + 1e-3;
    }
    const ySpan = Math.max(Math.abs(yMax), Math.abs(yMin), 1e-12);
    yMin = -ySpan * (1 + yPad);
    yMax = ySpan * (1 + yPad);

    this.xMin = xMin;
    this.xMax = xMax;
    this.yMin = yMin;
    this.yMax = yMax;
    this.chartTransform.setModelXRange(new Range(xMin, xMax));
    this.chartTransform.setModelYRange(new Range(yMin, yMax));

    for (let i = 0; i < this.traces.length; i++) {
      const path = this.traces[i];
      const trace = traces[i];
      if (!path) {
        continue;
      }
      if (!trace || trace.visible === false) {
        path.shape = null;
        path.visible = false;
        continue;
      }
      path.stroke = trace.stroke as never;
      path.lineWidth = trace.lineWidth ?? 1.2;
      path.shape = this.shapeFor(trace.t, trace.y);
      path.visible = true;
    }

    if (playheadT !== null && Number.isFinite(playheadT) && playheadT >= xMin && playheadT <= xMax) {
      const x = this.chartTransform.modelToViewX(playheadT);
      this.playhead.x1 = x;
      this.playhead.x2 = x;
      this.playhead.visible = true;
    } else {
      this.playhead.visible = false;
    }

    this.rebuildTicks();
  }

  private rebuildTicks(): void {
    this.tickLabels.removeAllChildren();
    const xStep = niceStep(this.xMax - this.xMin);
    const xStart = Math.ceil(this.xMin / xStep) * xStep;
    for (let x = xStart; x <= this.xMax + xStep * 1e-9; x += xStep) {
      if (x < this.xMin - xStep * 1e-9) {
        continue;
      }
      const vx = this.chartTransform.modelToViewX(x);
      this.tickLabels.addChild(
        new Text(formatTick(x, xStep), {
          font: SMALL_FONT,
          fill: GravitationalWavesColors.mutedTextColorProperty,
          centerX: vx,
          top: this.plotHeight + 2,
        }),
      );
    }

    if (this.showYTicks) {
      const yStep = niceStep(this.yMax - this.yMin);
      const yStart = Math.ceil(this.yMin / yStep) * yStep;
      for (let y = yStart; y <= this.yMax + yStep * 1e-9; y += yStep) {
        if (Math.abs(y) < yStep * 1e-9) {
          // Skip the zero label — the zero line already marks it.
          continue;
        }
        if (y < this.yMin - yStep * 1e-9) {
          continue;
        }
        const vy = this.chartTransform.modelToViewY(y);
        this.tickLabels.addChild(
          new Text(formatTick(y, yStep), {
            font: SMALL_FONT,
            fill: GravitationalWavesColors.mutedTextColorProperty,
            right: -4,
            centerY: vy,
          }),
        );
      }
    }
  }

  private shapeFor(t: Float64Array | readonly number[], y: Float64Array | readonly number[]): Shape | null {
    const n = Math.min(t.length, y.length);
    if (n < 2) {
      return null;
    }
    // Decimate for draw performance on long series.
    const step = Math.max(1, Math.floor(n / (this.plotWidth * 2)));
    const shape = new Shape();
    let started = false;
    for (let i = 0; i < n; i += step) {
      const ti = t[i];
      const yi = y[i];
      if (ti === undefined || yi === undefined || !Number.isFinite(ti) || !Number.isFinite(yi)) {
        continue;
      }
      const x = this.chartTransform.modelToViewX(ti);
      const yy = Math.max(0, Math.min(this.plotHeight, this.chartTransform.modelToViewY(yi)));
      if (!started) {
        shape.moveTo(x, yy);
        started = true;
      } else {
        shape.lineTo(x, yy);
      }
    }
    // Always include the last sample.
    const lastT = t[n - 1];
    const lastY = y[n - 1];
    if (lastT !== undefined && lastY !== undefined && Number.isFinite(lastT) && Number.isFinite(lastY)) {
      const x = this.chartTransform.modelToViewX(lastT);
      const yy = Math.max(0, Math.min(this.plotHeight, this.chartTransform.modelToViewY(lastY)));
      shape.lineTo(x, yy);
    }
    return started ? shape : null;
  }
}

/** Peak absolute value of a series (or 1 if empty). */
function peakAbs(values: Float64Array | readonly number[]): number {
  let peak = 0;
  for (const value of values) {
    peak = Math.max(peak, Math.abs(value));
  }
  return peak > 0 ? peak : 1;
}

/** Normalize a series to peak ±1 (returns a new array). */
export function normalizePeak(values: Float64Array | readonly number[]): Float64Array {
  const peak = peakAbs(values);
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    out[i] = (values[i] ?? 0) / peak;
  }
  return out;
}

/** Scale strain into units of 10⁻²¹ for display. */
export function strainIn1e21(h: Float64Array): Float64Array {
  const out = new Float64Array(h.length);
  for (let i = 0; i < h.length; i++) {
    out[i] = (h[i] ?? 0) / 1e-21;
  }
  return out;
}
