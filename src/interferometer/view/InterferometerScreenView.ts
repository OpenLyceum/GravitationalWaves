/**
 * InterferometerScreenView.ts
 *
 * Left: Michelson schematic + ΔP strip. Center: sensitivity chart. Right: controls.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { Node, Rectangle } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/GravitationalWavesButtonOptions.js";
import { StripChart } from "../../common/view/StripChart.js";
import { formatScientific } from "../../common/view/scientificFormat.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  CONTROL_PANEL_WIDTH,
  POWER_CHART_SAMPLE_RATE,
  POWER_CHART_WINDOW_S,
  SCREEN_VIEW_MARGIN,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { InterferometerModel } from "../model/InterferometerModel.js";
import { InterferometerControlPanel } from "./InterferometerControlPanel.js";
import { InterferometerScreenSummaryContent } from "./InterferometerScreenSummaryContent.js";
import { MichelsonNode } from "./MichelsonNode.js";
import { SensitivityChartNode } from "./SensitivityChartNode.js";

export type InterferometerScreenViewOptions = ScreenViewOptions;

export class InterferometerScreenView extends ScreenView {
  private readonly powerChart: StripChart;
  private readonly model: InterferometerModel;

  public constructor(model: InterferometerModel, providedOptions?: InterferometerScreenViewOptions) {
    const options = optionize<InterferometerScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new InterferometerScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);
    this.model = model;

    const strings = StringManager.getInstance().getInterferometerStrings();
    const a11y = StringManager.getInstance().getInterferometerA11yStrings();

    const backgroundRect = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: GravitationalWavesColors.backgroundColorProperty,
    });
    this.addChild(backgroundRect);

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

    const controlPanel = new InterferometerControlPanel(model);
    controlPanel.maxWidth = CONTROL_PANEL_WIDTH;
    const maxPanelHeight = this.layoutBounds.height - 2 * SCREEN_VIEW_MARGIN - 55;
    if (controlPanel.height > maxPanelHeight) {
      controlPanel.setScaleMagnitude(maxPanelHeight / controlPanel.height);
    }
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(controlPanel);
    this.addChild(resetAllButton);

    const leftWidth = controlPanel.left - 2 * SCREEN_VIEW_MARGIN;
    const chartWidth = Math.min(380, leftWidth * 0.52);
    const schematicWidth = leftWidth - chartWidth - 12;

    const michelson = new MichelsonNode(model);
    michelson.setScaleMagnitude(Math.min(1, schematicWidth / 360));
    michelson.left = SCREEN_VIEW_MARGIN + 20;
    michelson.top = SCREEN_VIEW_MARGIN + 10;
    this.addChild(michelson);

    this.powerChart = new StripChart(model.powerHistory, {
      width: Math.max(280, schematicWidth - 20),
      height: 96,
      title: strings.powerChartTitleStringProperty,
      yLabel: strings.powerAxisStringProperty,
      showZeroLine: true,
      windowSamples: () => Math.ceil(POWER_CHART_WINDOW_S * POWER_CHART_SAMPLE_RATE),
      ySpan: () => this.powerHalfSpan(),
      scaleFormatter: (span) =>
        StringUtils.fillIn(strings.powerFullScaleStringProperty.value, {
          value: formatScientific(span, 0),
        }),
      stroke: GravitationalWavesColors.powerTraceColorProperty,
    });
    this.powerChart.left = SCREEN_VIEW_MARGIN;
    this.powerChart.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(this.powerChart);

    const chartHeight = Math.min(300, this.powerChart.top - SCREEN_VIEW_MARGIN - 16);
    const sensitivity = new SensitivityChartNode(model, chartWidth, chartHeight);
    sensitivity.left = michelson.right + 16;
    sensitivity.top = SCREEN_VIEW_MARGIN;
    this.addChild(sensitivity);

    this.addChild(
      new Node({
        pdomOrder: [
          controlPanel.armLengthControl,
          controlPanel.fabryCheckbox,
          controlPanel.laserControl,
          controlPanel.seismicCheckbox,
          controlPanel.thermalCheckbox,
          controlPanel.shotCheckbox,
          controlPanel.realCurveCheckbox,
          controlPanel.thetaControl,
          controlPanel.psiControl,
          controlPanel.polarizationGroup,
          controlPanel.blindSpotButton,
          controlPanel.timeControl,
          resetAllButton,
        ],
      }),
    );
  }

  public reset(): void {
    // View state is fully driven by the model.
  }

  public override step(_dt: number): void {
    this.powerChart.update();
  }

  /** Auto-scale half-span from the AC power buffer (nice power-of-ten ceiling). */
  private powerHalfSpan(): number {
    const count = Math.min(Math.ceil(POWER_CHART_WINDOW_S * POWER_CHART_SAMPLE_RATE), this.model.powerHistory.length);
    let peak = 0;
    for (let age = 0; age < count; age++) {
      peak = Math.max(peak, Math.abs(this.model.powerHistory.atAge(age)));
    }
    if (!(peak > 0)) {
      // Fall back to the analytic amplitude so the axis is meaningful before samples arrive.
      peak = Math.max(this.model.deltaPowerRatioMagnitude(), 1e-12);
    }
    const exp = Math.ceil(Math.log10(peak));
    return 10 ** exp;
  }
}
