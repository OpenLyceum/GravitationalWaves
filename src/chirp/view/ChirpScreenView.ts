/**
 * ChirpScreenView.ts
 *
 * Left: strain + whitened plots. Middle-top: spectrogram. Bottom: readouts +
 * matched filter. Right: controls only (never scaled below 1). TimeControl under controls.
 */
import { Multilink } from "scenerystack/axon";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, Text } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import type { DetectorStrain } from "../../common/data/dataTypes.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/GravitationalWavesButtonOptions.js";
import { SMALL_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { SCREEN_VIEW_MARGIN, STEP_DT } from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { ChirpModel } from "../model/ChirpModel.js";
import { ChirpAudioPlayer } from "./ChirpAudioPlayer.js";
import { ChirpControlPanel } from "./ChirpControlPanel.js";
import { ChirpMatchedFilterPanel } from "./ChirpMatchedFilterPanel.js";
import { ChirpReadoutsPanel } from "./ChirpReadoutsPanel.js";
import { ChirpScreenSummaryContent } from "./ChirpScreenSummaryContent.js";
import { SpectrogramNode } from "./SpectrogramNode.js";
import { normalizePeak, strainIn1e21, TimeSeriesPlot } from "./TimeSeriesPlot.js";

export type ChirpScreenViewOptions = ScreenViewOptions;

function strainTimes(strain: DetectorStrain): Float64Array {
  const t = new Float64Array(strain.samples.length);
  for (let i = 0; i < t.length; i++) {
    t[i] = strain.startOffset + i / strain.sampleRate;
  }
  return t;
}

function strainValues(strain: DetectorStrain): Float64Array {
  const y = new Float64Array(strain.samples.length);
  for (let i = 0; i < y.length; i++) {
    y[i] = (strain.samples[i] ?? 0) * strain.scale;
  }
  return y;
}

/** Pad / trim template to the signal length for overlay (merger-aligned). */
function alignTemplate(template: Float64Array, length: number): Float64Array {
  if (template.length === length) {
    return template;
  }
  const out = new Float64Array(length);
  const copy = Math.min(length, template.length);
  const srcStart = Math.max(0, template.length - copy);
  const dstStart = Math.max(0, length - copy);
  for (let i = 0; i < copy; i++) {
    out[dstStart + i] = template[srcStart + i] ?? 0;
  }
  return out;
}

export class ChirpScreenView extends ScreenView {
  private readonly waveformPlot: TimeSeriesPlot;
  private readonly whitenedPlot: TimeSeriesPlot;
  private readonly shapeLabel: Text;
  private readonly audio: ChirpAudioPlayer;
  private readonly disposeView: () => void;

  public constructor(model: ChirpModel, providedOptions?: ChirpScreenViewOptions) {
    const options = optionize<ChirpScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new ChirpScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance().getChirpStrings();
    const a11y = StringManager.getInstance().getChirpA11yStrings();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: GravitationalWavesColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    this.audio = new ChirpAudioPlayer(model, this);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        this.audio.stop();
        model.reset();
        this.reset();
      },
      accessibleName: a11y.controls.resetAllStringProperty,
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    // Build panels first (no maxWidth scaling) so we can measure natural sizes.
    const controlPanel = new ChirpControlPanel(model, this, this.audio);
    const readoutsPanel = new ChirpReadoutsPanel(model);
    const matchedPanel = new ChirpMatchedFilterPanel(model);

    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(controlPanel);

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: [...model.timer.timeSpeeds],
      speedRadioButtonGroupPlacement: "right",
      flowBoxSpacing: 16,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.stepOnce(STEP_DT),
        },
      },
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
    });
    timeControl.centerX = controlPanel.centerX;
    timeControl.top = controlPanel.bottom + 8;
    if (timeControl.bottom > resetAllButton.top - 8) {
      timeControl.bottom = resetAllButton.top - 8;
    }
    this.addChild(timeControl);
    this.addChild(resetAllButton);

    const bottomRow = new HBox({
      spacing: 10,
      align: "top",
      children: [readoutsPanel, matchedPanel],
    });

    // Fixed plot height for readability; bottom row sits under the plots (left of controls).
    const playAreaRight = controlPanel.left - 12;
    const plotsTop = SCREEN_VIEW_MARGIN;
    const plotHeight = 135;
    const plotWidth = Math.min(560, Math.max(340, playAreaRight - SCREEN_VIEW_MARGIN - 300));
    const spectroWidth = Math.max(200, playAreaRight - SCREEN_VIEW_MARGIN - plotWidth - 10);

    this.waveformPlot = new TimeSeriesPlot({
      width: plotWidth,
      height: plotHeight,
      title: strings.waveformTitleStringProperty,
      xLabel: strings.waveformXAxisStringProperty,
      // Units live in the title ("[10⁻²¹]") so we only need room for numeric ticks.
      showYTicks: true,
      traceCount: 3,
    });
    const plotLeft = SCREEN_VIEW_MARGIN;
    this.waveformPlot.left = plotLeft;
    this.waveformPlot.top = plotsTop;
    this.addChild(this.waveformPlot);

    this.shapeLabel = new Text(strings.shapeOnlyStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      visible: false,
      maxWidth: 120,
    });
    this.shapeLabel.right = this.waveformPlot.right - 8;
    this.shapeLabel.top = this.waveformPlot.top + 4;
    this.addChild(this.shapeLabel);

    this.whitenedPlot = new TimeSeriesPlot({
      width: plotWidth,
      height: plotHeight,
      title: strings.whitenedTitleStringProperty,
      xLabel: strings.waveformXAxisStringProperty,
      traceCount: 3,
      showYTicks: false,
    });
    this.whitenedPlot.left = plotLeft;
    this.whitenedPlot.top = this.waveformPlot.bottom + 6;
    this.addChild(this.whitenedPlot);

    const spectroHeight = this.whitenedPlot.bottom - plotsTop;
    const spectro = new SpectrogramNode(model, spectroWidth, Math.max(180, spectroHeight));
    spectro.left = this.waveformPlot.right + 10;
    spectro.top = plotsTop;
    this.addChild(spectro);

    bottomRow.left = SCREEN_VIEW_MARGIN;
    bottomRow.top = Math.max(this.whitenedPlot.bottom, spectro.bottom) + 8;
    this.addChild(bottomRow);

    const plotsLink = Multilink.multilink(
      [
        model.waveformProperty,
        model.whitenedSignalProperty,
        model.dataProperty,
        model.noiseProperty,
        model.templateWhitenedProperty,
        model.loadedEventProperty,
        model.showL1Property,
        model.showHiddenSignalProperty,
        model.showTemplateProperty,
        model.playheadProperty,
        model.sourceProperty,
      ],
      () => this.updatePlots(model),
    );

    this.disposeView = () => {
      plotsLink.dispose();
      this.audio.dispose();
    };

    this.addChild(
      new Node({
        pdomOrder: [
          controlPanel.sourceCombo,
          controlPanel.mass1Control,
          controlPanel.mass2Control,
          controlPanel.distanceControl,
          controlPanel.showL1Checkbox,
          controlPanel.showHiddenSignalCheckbox,
          controlPanel.showTemplateCheckbox,
          controlPanel.showFrequencyTrackCheckbox,
          controlPanel.newNoiseButton,
          controlPanel.playChirpButton,
          matchedPanel.templateM1Control,
          matchedPanel.templateM2Control,
          matchedPanel.scanButton,
          timeControl,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    // View state is driven by the model.
  }

  public override step(_dt: number): void {
    // Plots refresh via Multilink on model Properties (including playhead).
  }

  public override dispose(): void {
    this.disposeView();
    super.dispose();
  }

  private updatePlots(model: ChirpModel): void {
    const waveform = model.waveformProperty.value;
    const playhead = model.playheadProperty.value;
    const event = model.loadedEventProperty.value;
    const showEvent = model.sourceProperty.value !== "custom" && event !== null;

    if (showEvent && event) {
      this.waveformPlot.update(
        [
          {
            t: strainTimes(event.H1),
            y: normalizePeak(strainValues(event.H1)),
            stroke: GravitationalWavesColors.chirpH1ColorProperty,
            lineWidth: 1,
          },
          {
            t: waveform.t,
            y: normalizePeak(waveform.h),
            stroke: GravitationalWavesColors.chirpSignalColorProperty,
            lineWidth: 1.5,
          },
          {
            t: strainTimes(event.L1),
            y: normalizePeak(strainValues(event.L1)),
            stroke: GravitationalWavesColors.chirpL1ColorProperty,
            lineWidth: 1,
            visible: model.showL1Property.value,
          },
        ],
        playhead,
        0.1,
      );
      this.shapeLabel.visible = true;
    } else {
      this.waveformPlot.update(
        [
          {
            t: waveform.t,
            y: strainIn1e21(waveform.h),
            stroke: GravitationalWavesColors.chirpSignalColorProperty,
            lineWidth: 1.5,
          },
        ],
        playhead,
        0.1,
      );
      this.shapeLabel.visible = false;
    }

    this.whitenedPlot.update(
      [
        {
          t: waveform.t,
          y: model.dataProperty.value,
          stroke: GravitationalWavesColors.chirpNoiseColorProperty,
          lineWidth: 1,
        },
        {
          t: waveform.t,
          y: model.whitenedSignalProperty.value,
          stroke: GravitationalWavesColors.chirpSignalColorProperty,
          lineWidth: 1.5,
          visible: model.showHiddenSignalProperty.value,
        },
        {
          t: waveform.t,
          y: alignTemplate(model.templateWhitenedProperty.value, waveform.t.length),
          stroke: GravitationalWavesColors.chirpTemplateColorProperty,
          lineWidth: 1.2,
          visible: model.showTemplateProperty.value,
        },
      ],
      playhead,
      0.1,
    );
  }
}
