/**
 * SpectrogramNode.ts
 *
 * Time–frequency image of whitened data with an optional model f(t) track.
 * Log-frequency interpolated pixels; frequency / time tick labels; quiet→loud key.
 */
import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { roundSymmetric, toFixed } from "scenerystack/dot";
import { Color, Image, Line, Node, Rectangle, Text } from "scenerystack/scenery";
import { SMALL_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  CHIRP_SAMPLE_RATE,
  CHIRP_SPECTROGRAM_F_MAX,
  CHIRP_SPECTROGRAM_F_MIN,
  CHIRP_SPECTROGRAM_FFT,
  CHIRP_SPECTROGRAM_HOP_FRACTION,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { ChirpModel } from "../model/ChirpModel.js";
import { computeSpectrogram } from "./spectrogramCompute.js";

const FREQ_TICKS_HZ = [20, 50, 100, 200, 500] as const;

function parseColor(property: TReadOnlyProperty<unknown>): Color {
  const v = property.value;
  if (v instanceof Color) {
    return v;
  }
  return new Color(String(v));
}

function lerpChannel(a: number, b: number, t: number): number {
  return roundSymmetric(a + (b - a) * t);
}

function mapColor(t: number, low: Color, mid: Color, high: Color): { r: number; g: number; b: number } {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.5) {
    const u = x * 2;
    return {
      r: lerpChannel(low.r, mid.r, u),
      g: lerpChannel(low.g, mid.g, u),
      b: lerpChannel(low.b, mid.b, u),
    };
  }
  const u = (x - 0.5) * 2;
  return {
    r: lerpChannel(mid.r, high.r, u),
    g: lerpChannel(mid.g, high.g, u),
    b: lerpChannel(mid.b, high.b, u),
  };
}

/** Nice time-tick step aiming for ~4–5 labels. */
function niceTimeStep(span: number): number {
  if (!(span > 0 && Number.isFinite(span))) {
    return 0.2;
  }
  const raw = span / 4;
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

export class SpectrogramNode extends Node {
  private readonly canvas: HTMLCanvasElement;
  private readonly image: Image;
  private readonly playhead: Line;
  private readonly freqTrack: Line;
  private readonly tickLabels: Node;
  private readonly plotLeft: number;
  private readonly plotTop: number;
  private readonly plotWidth: number;
  private readonly plotHeight: number;
  private tMin = -1;
  private tMax = 0.1;
  private readonly disposeNode: () => void;

  public constructor(model: ChirpModel, width: number, height: number) {
    super({ pickable: false });
    const strings = StringManager.getInstance().getChirpStrings();

    this.plotLeft = 44;
    this.plotTop = 22;
    const bottom = 28;
    const colorBarWidth = 10;
    const colorBarGap = 6;
    const keyGutter = 18;
    const rightGutter = colorBarWidth + colorBarGap + keyGutter;
    this.plotWidth = width - this.plotLeft - rightGutter;
    this.plotHeight = height - this.plotTop - bottom;

    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.max(1, Math.floor(this.plotWidth));
    this.canvas.height = Math.max(1, Math.floor(this.plotHeight));

    const backing = new Rectangle(0, 0, width, height, {
      cornerRadius: 4,
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });
    const title = new Text(strings.spectrogramTitleStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      left: this.plotLeft,
      top: 4,
      maxWidth: this.plotWidth,
    });
    const yLabel = new Text(strings.spectrogramFreqAxisStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      rotation: -Math.PI / 2,
      maxWidth: this.plotHeight,
    });
    yLabel.centerX = 11;
    yLabel.centerY = this.plotTop + this.plotHeight / 2;

    this.image = new Image(this.canvas, {
      left: this.plotLeft,
      top: this.plotTop,
    });
    this.image.setScaleMagnitude(this.plotWidth / this.canvas.width, this.plotHeight / this.canvas.height);

    this.playhead = new Line(0, 0, 0, this.plotHeight, {
      stroke: GravitationalWavesColors.chirpPlayheadColorProperty,
      lineWidth: 1,
      lineDash: [3, 3],
      visible: false,
      // Translate rather than set left/top, which would fold the stroke width into the offset.
      x: this.plotLeft,
      y: this.plotTop,
    });

    this.freqTrack = new Line(0, 0, 0, 0, {
      stroke: GravitationalWavesColors.chirpFrequencyTrackColorProperty,
      lineWidth: 1.5,
      visible: false,
    });

    this.tickLabels = new Node();

    const barLeft = this.plotLeft + this.plotWidth + colorBarGap;
    const colorBar = this.buildColorBar(barLeft, this.plotTop, colorBarWidth, this.plotHeight);
    const keyLabel = new Text(strings.spectrogramKeyStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      rotation: -Math.PI / 2,
      maxWidth: this.plotHeight,
    });
    keyLabel.centerX = barLeft + colorBarWidth + 10;
    keyLabel.centerY = this.plotTop + this.plotHeight / 2;

    this.children = [
      backing,
      title,
      yLabel,
      this.image,
      this.playhead,
      this.freqTrack,
      this.tickLabels,
      colorBar,
      keyLabel,
    ];

    const multilink = Multilink.multilink(
      [
        model.dataProperty,
        model.waveformProperty,
        model.showFrequencyTrackProperty,
        model.playheadProperty,
        GravitationalWavesColors.spectrogramLowColorProperty,
        GravitationalWavesColors.spectrogramMidColorProperty,
        GravitationalWavesColors.spectrogramHighColorProperty,
      ],
      () => this.redraw(model),
    );
    this.disposeNode = () => {
      multilink.dispose();
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

  private buildColorBar(left: number, top: number, w: number, h: number): Node {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const low = parseColor(GravitationalWavesColors.spectrogramLowColorProperty);
      const mid = parseColor(GravitationalWavesColors.spectrogramMidColorProperty);
      const high = parseColor(GravitationalWavesColors.spectrogramHighColorProperty);
      const img = ctx.createImageData(canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        const level = 1 - (y + 0.5) / canvas.height;
        const c = mapColor(level, low, mid, high);
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          img.data[idx] = c.r;
          img.data[idx + 1] = c.g;
          img.data[idx + 2] = c.b;
          img.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    const image = new Image(canvas, { left, top });
    const border = new Rectangle(left, top, w, h, {
      stroke: GravitationalWavesColors.chartBorderColorProperty,
      lineWidth: 1,
    });
    return new Node({ children: [image, border] });
  }

  private redraw(model: ChirpModel): void {
    const waveform = model.waveformProperty.value;
    const t0 = waveform.t[0] ?? 0;
    const t1 = waveform.t[waveform.t.length - 1] ?? 0.1;
    this.tMin = t0;
    this.tMax = t1 > t0 ? t1 : t0 + 1e-3;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const spec = computeSpectrogram(model.dataProperty.value, CHIRP_SAMPLE_RATE, {
      fftSize: CHIRP_SPECTROGRAM_FFT,
      hopFraction: CHIRP_SPECTROGRAM_HOP_FRACTION,
      fMin: CHIRP_SPECTROGRAM_F_MIN,
      fMax: CHIRP_SPECTROGRAM_F_MAX,
      nFreq: 96,
      t0,
    });
    this.paintPower(ctx, spec);
    this.updatePlayhead(model.playheadProperty.value);
    this.freqTrack.visible = false;
    if (model.showFrequencyTrackProperty.value && waveform.f.length > 1) {
      this.paintFrequencyTrack(ctx, waveform.t, waveform.f);
    }
    this.rebuildTicks();
    this.image.image = this.canvas;
  }

  private paintPower(ctx: CanvasRenderingContext2D, spec: ReturnType<typeof computeSpectrogram>): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const img = ctx.createImageData(w, h);
    const low = parseColor(GravitationalWavesColors.spectrogramLowColorProperty);
    const mid = parseColor(GravitationalWavesColors.spectrogramMidColorProperty);
    const high = parseColor(GravitationalWavesColors.spectrogramHighColorProperty);

    let maxP = 0;
    for (const p of spec.power) {
      maxP = Math.max(maxP, p);
    }
    const logMax = Math.log10(maxP + 1e-30);
    const logFMin = Math.log(spec.fMin);
    const logFMax = Math.log(spec.fMax);
    const nFreq = Math.max(1, spec.nFreq);

    for (let y = 0; y < h; y++) {
      const freqFrac = 1 - (y + 0.5) / h;
      const logF = logFMin + freqFrac * (logFMax - logFMin);
      // Continuous index into log-spaced frequency columns; interpolate.
      const fIndex = ((logF - logFMin) / (logFMax - logFMin)) * (nFreq - 1);
      const fi0 = Math.max(0, Math.min(nFreq - 1, Math.floor(fIndex)));
      const fi1 = Math.max(0, Math.min(nFreq - 1, fi0 + 1));
      const frac = Math.max(0, Math.min(1, fIndex - fi0));

      for (let x = 0; x < w; x++) {
        const tFrac = (x + 0.5) / w;
        const tIndex = spec.nTime <= 1 ? 0 : tFrac * (spec.nTime - 1);
        const ti0 = Math.max(0, Math.min(spec.nTime - 1, Math.floor(tIndex)));
        const ti1 = Math.max(0, Math.min(spec.nTime - 1, ti0 + 1));
        const tFrac2 = Math.max(0, Math.min(1, tIndex - ti0));

        const p00 = spec.power[ti0 * nFreq + fi0] ?? 0;
        const p01 = spec.power[ti0 * nFreq + fi1] ?? 0;
        const p10 = spec.power[ti1 * nFreq + fi0] ?? 0;
        const p11 = spec.power[ti1 * nFreq + fi1] ?? 0;
        const p0 = p00 + (p01 - p00) * frac;
        const p1 = p10 + (p11 - p10) * frac;
        const p = p0 + (p1 - p0) * tFrac2;

        const level = logMax > -30 ? Math.max(0, Math.log10(p + 1e-30) / logMax) : 0;
        const c = mapColor(level, low, mid, high);
        const idx = (y * w + x) * 4;
        img.data[idx] = c.r;
        img.data[idx + 1] = c.g;
        img.data[idx + 2] = c.b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private rebuildTicks(): void {
    this.tickLabels.removeAllChildren();
    const logMin = Math.log(CHIRP_SPECTROGRAM_F_MIN);
    const logMax = Math.log(CHIRP_SPECTROGRAM_F_MAX);

    for (const f of FREQ_TICKS_HZ) {
      if (f < CHIRP_SPECTROGRAM_F_MIN || f > CHIRP_SPECTROGRAM_F_MAX) {
        continue;
      }
      const frac = (Math.log(f) - logMin) / (logMax - logMin);
      const y = this.plotTop + (1 - frac) * this.plotHeight;
      this.tickLabels.addChild(
        new Text(String(f), {
          font: SMALL_FONT,
          fill: GravitationalWavesColors.mutedTextColorProperty,
          right: this.plotLeft - 4,
          centerY: y,
        }),
      );
    }

    const span = this.tMax - this.tMin;
    const step = niceTimeStep(span);
    const start = Math.ceil(this.tMin / step) * step;
    for (let t = start; t <= this.tMax + step * 1e-9; t += step) {
      if (t < this.tMin - step * 1e-9) {
        continue;
      }
      const x = this.plotLeft + ((t - this.tMin) / span) * this.plotWidth;
      const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
      this.tickLabels.addChild(
        new Text(toFixed(t, decimals), {
          font: SMALL_FONT,
          fill: GravitationalWavesColors.mutedTextColorProperty,
          centerX: x,
          top: this.plotTop + this.plotHeight + 2,
        }),
      );
    }
  }

  private updatePlayhead(playheadT: number): void {
    if (playheadT >= this.tMin && playheadT <= this.tMax) {
      const x = ((playheadT - this.tMin) / (this.tMax - this.tMin)) * this.plotWidth;
      this.playhead.x1 = x;
      this.playhead.x2 = x;
      this.playhead.visible = true;
    } else {
      this.playhead.visible = false;
    }
  }

  private paintFrequencyTrack(ctx: CanvasRenderingContext2D, tArr: Float64Array, fArr: Float64Array): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.strokeStyle = parseColor(GravitationalWavesColors.chirpFrequencyTrackColorProperty).toCSS();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    const step = Math.max(1, Math.floor(tArr.length / (w * 2)));
    const logMin = Math.log(CHIRP_SPECTROGRAM_F_MIN);
    const logMaxF = Math.log(CHIRP_SPECTROGRAM_F_MAX);
    for (let i = 0; i < tArr.length; i += step) {
      const t = tArr[i] ?? 0;
      const f = fArr[i] ?? 0;
      if (!(f > 0) || t < this.tMin || t > this.tMax) {
        continue;
      }
      const logF = Math.log(f);
      if (logF < logMin || logF > logMaxF) {
        continue;
      }
      const x = ((t - this.tMin) / (this.tMax - this.tMin)) * w;
      const y = (1 - (logF - logMin) / (logMaxF - logMin)) * h;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (started) {
      ctx.stroke();
    }
  }
}
