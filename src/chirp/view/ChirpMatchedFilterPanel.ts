/**
 * ChirpMatchedFilterPanel.ts
 *
 * Template mass sliders, recovered-SNR bar, scan button + SNR-vs-ℳ′ plot.
 */
import { Multilink } from "scenerystack/axon";
import { Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import { RectangularPushButton } from "scenerystack/sun";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/GravitationalWavesButtonOptions.js";
import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
import { SMALL_FONT, TITLE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import { chirpNumberControlOptions } from "../../common/view/themedNumberControl.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { CHIRP_DETECTION_SNR, CHIRP_MASS_RANGE, CHIRP_MATCHED_WIDTH } from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { ChirpModel } from "../model/ChirpModel.js";
import { SnrScanChart } from "./SnrScanChart.js";

export class ChirpMatchedFilterPanel extends GravitationalWavesPanel {
  public readonly templateM1Control: NumberControl;
  public readonly templateM2Control: NumberControl;
  public readonly scanButton: RectangularPushButton;
  private readonly disposePanel: () => void;

  public constructor(model: ChirpModel) {
    const strings = StringManager.getInstance().getChirpStrings();
    const a11y = StringManager.getInstance().getChirpA11yStrings();

    const title = new Text(strings.matchedFilterTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: CHIRP_MATCHED_WIDTH - 24,
    });

    const templateM1Control = new NumberControl(
      strings.templateMass1StringProperty,
      model.templateM1Property,
      CHIRP_MASS_RANGE,
      {
        ...chirpNumberControlOptions(strings.massPatternStringProperty, 1),
        delta: 0.5,
        accessibleName: a11y.controls.templateMass1StringProperty,
      },
    );
    const templateM2Control = new NumberControl(
      strings.templateMass2StringProperty,
      model.templateM2Property,
      CHIRP_MASS_RANGE,
      {
        ...chirpNumberControlOptions(strings.massPatternStringProperty, 1),
        delta: 0.5,
        accessibleName: a11y.controls.templateMass2StringProperty,
      },
    );

    const barWidth = CHIRP_MATCHED_WIDTH - 40;
    const barBg = new Rectangle(0, 0, barWidth, 8, {
      cornerRadius: 3,
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });
    const barFill = new Rectangle(0, 0, 1, 8, {
      cornerRadius: 3,
      fill: GravitationalWavesColors.chirpSignalColorProperty,
    });
    const bar = new Rectangle(0, 0, barWidth, 8, { children: [barBg, barFill] });

    const scanChart = new SnrScanChart({
      width: 260,
      height: 110,
      title: strings.snrScanTitleStringProperty,
      xLabel: strings.snrScanXAxisStringProperty,
      yLabel: strings.snrScanYAxisStringProperty,
    });

    const scanButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(strings.scanTemplatesStringProperty, {
        font: SMALL_FONT,
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: 160,
      }),
      listener: () => {
        model.scanTemplates();
        scanChart.update(model.snrScanProperty.value, model.chirpMassProperty.value);
      },
      accessibleName: a11y.controls.scanTemplatesStringProperty,
    });

    const note = new Text(strings.matchNoteStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: CHIRP_MATCHED_WIDTH - 28,
    });

    const content = new VBox({
      spacing: 4,
      align: "left",
      children: [title, templateM1Control, templateM2Control, bar, scanButton, scanChart, note],
    });

    // Never set maxWidth on the Panel — Scenery would scale the whole panel.
    super(content, { xMargin: 10, yMargin: 8 });

    this.templateM1Control = templateM1Control;
    this.templateM2Control = templateM2Control;
    this.scanButton = scanButton;

    const barLink = Multilink.multilink([model.recoveredSnrProperty], (snr) => {
      const frac = Math.max(0, Math.min(1, snr / (CHIRP_DETECTION_SNR * 2)));
      barFill.rectWidth = Math.max(1, frac * barWidth);
      barFill.fill =
        snr >= CHIRP_DETECTION_SNR
          ? GravitationalWavesColors.chirpDetectedColorProperty.value
          : GravitationalWavesColors.chirpSignalColorProperty.value;
    });

    const scanLink = Multilink.multilink([model.snrScanProperty, model.chirpMassProperty], (scan, mc) =>
      scanChart.update(scan, mc),
    );

    this.disposePanel = () => {
      barLink.dispose();
      scanLink.dispose();
    };
  }

  public override dispose(): void {
    this.disposePanel();
    super.dispose();
  }
}
