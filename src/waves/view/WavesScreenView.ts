/**
 * WavesScreenView.ts
 *
 * Play area: deforming test-mass ring, strain strip, control + real-scale panels,
 * TimeControlNode centred under the ring.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/GravitationalWavesButtonOptions.js";
import { StripChart } from "../../common/view/StripChart.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  CONTROL_PANEL_WIDTH,
  SCREEN_VIEW_MARGIN,
  STEP_DT,
  STRAIN_CHART_CYCLES,
  STRAIN_CHART_SAMPLE_RATE,
  TEST_MASS_RING_RADIUS,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { WavesModel } from "../model/WavesModel.js";
import { RealScalePanel } from "./RealScalePanel.js";
import { TestMassRingNode } from "./TestMassRingNode.js";
import { WavesControlPanel } from "./WavesControlPanel.js";
import { WavesScreenSummaryContent } from "./WavesScreenSummaryContent.js";

export type WavesScreenViewOptions = ScreenViewOptions;

export class WavesScreenView extends ScreenView {
  private readonly strainChart: StripChart;

  public constructor(model: WavesModel, providedOptions?: WavesScreenViewOptions) {
    const options = optionize<WavesScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new WavesScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance().getWavesStrings();
    const a11y = StringManager.getInstance().getWavesA11yStrings();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: GravitationalWavesColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

    const controlPanel = new WavesControlPanel(model);
    controlPanel.maxWidth = CONTROL_PANEL_WIDTH;

    const realScalePanel = new RealScalePanel(model);
    realScalePanel.maxWidth = CONTROL_PANEL_WIDTH;

    const rightColumn = new VBox({
      spacing: 10,
      align: "right",
      children: [controlPanel, realScalePanel],
    });
    rightColumn.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    rightColumn.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(rightColumn);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
        this.reset();
      },
      accessibleName: a11y.controls.resetAllStringProperty,
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    // Keep the column clear of Reset All (scale down if the stack is too tall).
    const maxColumnBottom = resetAllButton.top - 8;
    if (rightColumn.bottom > maxColumnBottom) {
      const available = maxColumnBottom - rightColumn.top;
      if (available > 40 && rightColumn.height > available) {
        rightColumn.setScaleMagnitude(available / rightColumn.height);
        rightColumn.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
        rightColumn.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
      } else {
        rightColumn.bottom = maxColumnBottom;
      }
    }

    const playAreaRight = rightColumn.left - 16;

    const ring = new TestMassRingNode(model);
    // Centre the ring in the free play area (left of the right-column panels).
    ring.centerX = Math.min(this.layoutBounds.centerX - 40, (SCREEN_VIEW_MARGIN + playAreaRight) / 2);
    ring.centerY = this.layoutBounds.centerY - 55;
    this.addChild(ring);

    // Widen the strip so its right edge lines up with the ring.
    const strainWidth = Math.max(
      360,
      Math.min(playAreaRight, ring.centerX + TEST_MASS_RING_RADIUS) - SCREEN_VIEW_MARGIN,
    );
    this.strainChart = new StripChart(model.strainHistory, {
      width: strainWidth,
      height: 100,
      title: strings.strainChartTitleStringProperty,
      yLabel: strings.strainAxisStringProperty,
      showZeroLine: true,
      windowSamples: () => Math.ceil((STRAIN_CHART_CYCLES / model.frequencyProperty.value) * STRAIN_CHART_SAMPLE_RATE),
      ySpan: () => Math.max(model.visualStrainProperty.value, 0.05),
      stroke: GravitationalWavesColors.strainTraceColorProperty,
    });
    this.strainChart.left = SCREEN_VIEW_MARGIN;
    this.strainChart.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(this.strainChart);

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: [...model.timer.timeSpeeds],
      // Speeds to the right of play/pause (standard); ring is left of the panels so Fast fits.
      speedRadioButtonGroupPlacement: "right",
      flowBoxSpacing: 20,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.stepOnce(STEP_DT),
        },
      },
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
    });
    timeControl.centerX = ring.centerX;
    timeControl.top = ring.centerY + TEST_MASS_RING_RADIUS + 18;
    if (timeControl.right > playAreaRight) {
      timeControl.right = playAreaRight;
    }
    if (timeControl.bottom > this.strainChart.top - 8) {
      timeControl.bottom = this.strainChart.top - 8;
    }
    this.addChild(timeControl);

    this.addChild(
      new Node({
        pdomOrder: [
          controlPanel.polarizationGroup,
          controlPanel.exaggerationControl,
          controlPanel.frequencyControl,
          timeControl,
          realScalePanel.strainControl,
          realScalePanel.baselineGroup,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    // View state is fully driven by the model.
  }

  public override step(_dt: number): void {
    this.strainChart.update();
  }
}
