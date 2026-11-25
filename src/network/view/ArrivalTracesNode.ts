/**
 * ArrivalTracesNode.ts
 *
 * Stacked arrival-time traces for each enabled detector, with playhead and GWOSC notes.
 */
import { Multilink } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { StringUtils } from "scenerystack/phetcommon";
import { Line, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import type { DetectorId } from "../../common/model/DetectorNetwork.js";
import { LABEL_FONT, SMALL_FONT, TITLE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  NETWORK_TRACE_END_S,
  NETWORK_TRACE_START_S,
  NETWORK_TRACES_HEIGHT,
  NETWORK_TRACES_WIDTH,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { NetworkModel } from "../model/NetworkModel.js";
import { GW150914_MEASURED_DELAY } from "../model/networkPresets.js";
import { detectorColorProperty } from "./networkDetectorColors.js";

const PLOT_LEFT = 88;
const PLOT_TOP = 36;
const PLOT_BOTTOM = 50;
const TICK_MS = 10;

function signedMs(seconds: number): { sign: string; value: string } {
  const ms = seconds * 1e3;
  return {
    sign: ms >= 0 ? "+" : "−",
    value: toFixed(Math.abs(ms), 1),
  };
}

export class ArrivalTracesNode extends Node {
  private readonly plotWidth: number;
  private readonly plotHeight: number;
  private readonly tracesLayer: Node;
  private readonly playhead: Line;
  private readonly measuredNote: Text;
  private readonly credit: Text;
  private readonly disposeNode: () => void;

  public constructor(model: NetworkModel) {
    super({ pickable: false });
    const strings = StringManager.getInstance().getNetworkStrings();
    const chirpStrings = StringManager.getInstance().getChirpStrings();

    this.plotWidth = NETWORK_TRACES_WIDTH - PLOT_LEFT - 8;
    this.plotHeight = NETWORK_TRACES_HEIGHT - PLOT_TOP - PLOT_BOTTOM;

    const title = new Text(strings.tracesTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      left: 0,
      top: 0,
      maxWidth: NETWORK_TRACES_WIDTH,
    });
    const caption = new Text(strings.tracesCaptionStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      left: 0,
      top: 18,
      maxWidth: NETWORK_TRACES_WIDTH,
    });

    const background = new Rectangle(PLOT_LEFT, PLOT_TOP, this.plotWidth, this.plotHeight, {
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });

    this.tracesLayer = new Node();
    this.playhead = new Line(0, PLOT_TOP, 0, PLOT_TOP + this.plotHeight, {
      stroke: GravitationalWavesColors.networkPlayheadColorProperty,
      lineWidth: 1.5,
      visible: false,
    });

    const xAxisLabel = new Text(strings.tracesXAxisStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      centerX: PLOT_LEFT + this.plotWidth / 2,
      top: PLOT_TOP + this.plotHeight + 17,
      maxWidth: this.plotWidth,
    });

    this.measuredNote = new Text("", {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      left: 0,
      top: NETWORK_TRACES_HEIGHT - 14,
      maxWidth: NETWORK_TRACES_WIDTH * 0.72,
      visible: false,
    });
    const credit = new Text(chirpStrings.gwoscCreditStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      right: NETWORK_TRACES_WIDTH,
      top: NETWORK_TRACES_HEIGHT - 14,
      maxWidth: NETWORK_TRACES_WIDTH * 0.28,
      visible: false,
    });
    this.credit = credit;

    this.children = [
      title,
      caption,
      background,
      this.tracesLayer,
      this.playhead,
      xAxisLabel,
      this.measuredNote,
      credit,
    ];

    const multilink = Multilink.multilink(
      [
        model.tracesProperty,
        model.readingsProperty,
        model.playheadProperty,
        model.sourceProperty,
        model.timer.isPlayingProperty,
        model.timer.timeProperty,
        strings.arrivalMsStringProperty,
        strings.measuredDelayNoteStringProperty,
        strings.detectorShortH1StringProperty,
        strings.detectorShortL1StringProperty,
        strings.detectorShortV1StringProperty,
        strings.detectorShortK1StringProperty,
      ],
      () => this.redraw(model, strings),
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

  private shortLabel(id: DetectorId, strings: ReturnType<StringManager["getNetworkStrings"]>): string {
    switch (id) {
      case "H1":
        return strings.detectorShortH1StringProperty.value;
      case "L1":
        return strings.detectorShortL1StringProperty.value;
      case "V1":
        return strings.detectorShortV1StringProperty.value;
      case "K1":
        return strings.detectorShortK1StringProperty.value;
    }
  }

  private timeToX(tSeconds: number): number {
    const tMin = NETWORK_TRACE_START_S;
    const tMax = NETWORK_TRACE_END_S;
    return PLOT_LEFT + ((tSeconds - tMin) / (tMax - tMin)) * this.plotWidth;
  }

  private redraw(model: NetworkModel, strings: ReturnType<StringManager["getNetworkStrings"]>): void {
    this.tracesLayer.removeAllChildren();
    const readings = model.readingsProperty.value;
    const traces = model.tracesProperty.value;
    const n = Math.max(1, readings.length);
    const rowHeight = this.plotHeight / n;

    // Shared time-axis ticks (ms).
    const tMinMs = NETWORK_TRACE_START_S * 1e3;
    const tMaxMs = NETWORK_TRACE_END_S * 1e3;
    for (let ms = Math.ceil(tMinMs / TICK_MS) * TICK_MS; ms <= tMaxMs; ms += TICK_MS) {
      const x = this.timeToX(ms / 1e3);
      this.tracesLayer.addChild(
        new Line(x, PLOT_TOP, x, PLOT_TOP + this.plotHeight, {
          stroke: GravitationalWavesColors.chartGridColorProperty,
          lineWidth: 0.5,
        }),
      );
      this.tracesLayer.addChild(
        new Text(String(ms), {
          font: SMALL_FONT,
          fill: GravitationalWavesColors.mutedTextColorProperty,
          centerX: x,
          top: PLOT_TOP + this.plotHeight + 2,
          maxWidth: 28,
        }),
      );
    }

    readings.forEach((reading, row) => {
      const y0 = PLOT_TOP + row * rowHeight;
      const yMid = y0 + rowHeight / 2;
      const clip = new Rectangle(PLOT_LEFT, y0, this.plotWidth, rowHeight);
      const rowNode = new Node({ clipArea: Shape.bounds(clip.bounds) });

      // Zero line
      rowNode.addChild(
        new Line(PLOT_LEFT, yMid, PLOT_LEFT + this.plotWidth, yMid, {
          stroke: GravitationalWavesColors.chartGridColorProperty,
          lineWidth: 1,
        }),
      );

      const color = detectorColorProperty(reading.id);
      const samples = traces.get(reading.id);
      if (samples && samples.length > 1) {
        const shape = new Shape();
        const amp = (rowHeight / 2) * 0.85;
        for (let i = 0; i < samples.length; i++) {
          const x = this.timeToX(model.traceTimes[i] ?? 0);
          const y = yMid - (samples[i] ?? 0) * amp;
          if (i === 0) {
            shape.moveTo(x, y);
          } else {
            shape.lineTo(x, y);
          }
        }
        rowNode.addChild(
          new Path(shape, {
            stroke: color,
            lineWidth: 1.5,
          }),
        );
      }

      // Arrival tick
      const ax = this.timeToX(reading.arrival);
      rowNode.addChild(
        new Line(ax, y0 + 2, ax, y0 + rowHeight - 2, {
          stroke: color,
          lineWidth: 1.2,
        }),
      );
      const signed = signedMs(reading.arrival);
      rowNode.addChild(
        new Text(
          StringUtils.fillIn(strings.arrivalMsStringProperty.value, {
            sign: signed.sign,
            value: signed.value,
          }),
          {
            font: SMALL_FONT,
            fill: color,
            left: ax + 3,
            top: y0 + 2,
            maxWidth: 56,
          },
        ),
      );

      this.tracesLayer.addChild(rowNode);
      this.tracesLayer.addChild(
        new Text(this.shortLabel(reading.id, strings), {
          font: LABEL_FONT,
          fill: color,
          right: PLOT_LEFT - 6,
          centerY: yMid,
          maxWidth: PLOT_LEFT - 8,
        }),
      );

      // Row separator
      if (row > 0) {
        this.tracesLayer.addChild(
          new Line(PLOT_LEFT, y0, PLOT_LEFT + this.plotWidth, y0, {
            stroke: GravitationalWavesColors.chartBorderColorProperty,
            lineWidth: 0.5,
          }),
        );
      }
    });

    const playing = model.timer.isPlayingProperty.value || model.timer.timeProperty.value > 0;
    const px = this.timeToX(model.playheadProperty.value);
    this.playhead.x1 = px;
    this.playhead.x2 = px;
    this.playhead.visible = playing;

    // The GWOSC credit applies to the real-event presets only.
    this.credit.visible = model.sourceProperty.value !== "custom";
    if (model.sourceProperty.value === "GW150914") {
      this.measuredNote.string = StringUtils.fillIn(strings.measuredDelayNoteStringProperty.value, {
        delay: toFixed(GW150914_MEASURED_DELAY * 1e3, 1),
      });
      this.measuredNote.visible = true;
    } else {
      this.measuredNote.visible = false;
    }
  }
}
