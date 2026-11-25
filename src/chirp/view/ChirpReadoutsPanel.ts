/**
 * ChirpReadoutsPanel.ts
 *
 * Compact GridBox of chirp mass / band / SNR readouts, SNR bar with threshold-8
 * tick and detection badge, plus catalog note for presets.
 */
import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { GridBox, HBox, Line, Node, Rectangle, RichText, Text, VBox } from "scenerystack/scenery";
import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
import { LABEL_FONT, SMALL_FONT, TITLE_FONT, VALUE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { CHIRP_DETECTION_SNR, CHIRP_READOUTS_WIDTH } from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { ChirpModel } from "../model/ChirpModel.js";

export class ChirpReadoutsPanel extends GravitationalWavesPanel {
  private readonly disposePanel: () => void;

  public constructor(model: ChirpModel) {
    const strings = StringManager.getInstance().getChirpStrings();

    const title = new Text(strings.readoutsTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: CHIRP_READOUTS_WIDTH - 24,
    });

    const labelNode = (property: TReadOnlyProperty<string>) =>
      new Text(property, {
        font: LABEL_FONT,
        fill: GravitationalWavesColors.mutedTextColorProperty,
        maxWidth: 150,
      });
    const valueNode = (valueProperty: TReadOnlyProperty<string>) =>
      new RichText(valueProperty, {
        font: VALUE_FONT,
        fill: GravitationalWavesColors.textColorProperty,
        maxWidth: 110,
      });

    const chirpMassValueProperty = new DerivedProperty(
      [model.chirpMassProperty, strings.chirpMassValueStringProperty],
      (mc, pattern) => StringUtils.fillIn(pattern, { value: toFixed(mc, 2) }),
    );
    const timeInBandValueProperty = new DerivedProperty(
      [model.timeInBandProperty, strings.timeInBandValueStringProperty],
      (t, pattern) => StringUtils.fillIn(pattern, { value: t >= 100 ? toFixed(t, 0) : toFixed(t, 2) }),
    );
    const fIscoValueProperty = new DerivedProperty(
      [model.fIscoProperty, strings.fIscoValueStringProperty],
      (f, pattern) => StringUtils.fillIn(pattern, { value: toFixed(f, 1) }),
    );
    const optimalValueProperty = new DerivedProperty(
      [model.optimalSnrProperty, strings.optimalSnrValueStringProperty],
      (snr, pattern) => StringUtils.fillIn(pattern, { value: toFixed(snr, 1) }),
    );
    const recoveredValueProperty = new DerivedProperty(
      [model.recoveredSnrProperty, strings.recoveredSnrValueStringProperty],
      (snr, pattern) => StringUtils.fillIn(pattern, { value: toFixed(snr, 1) }),
    );
    const catalogValueProperty = new DerivedProperty(
      [model.catalogNetworkSnrProperty, strings.catalogSnrStringProperty],
      (snr, pattern) => (snr === null ? "" : StringUtils.fillIn(pattern, { value: toFixed(snr, 1) })),
    );

    const grid = new GridBox({
      xSpacing: 10,
      ySpacing: 3,
      xAlign: "left",
      yAlign: "center",
      rows: [
        [labelNode(strings.chirpMassStringProperty), valueNode(chirpMassValueProperty)],
        [labelNode(strings.timeInBandStringProperty), valueNode(timeInBandValueProperty)],
        [labelNode(strings.fIscoStringProperty), valueNode(fIscoValueProperty)],
        [labelNode(strings.optimalSnrStringProperty), valueNode(optimalValueProperty)],
        [labelNode(strings.recoveredSnrStringProperty), valueNode(recoveredValueProperty)],
      ],
    });

    const barWidth = 140;
    const barHeight = 12;
    const snrScaleMax = CHIRP_DETECTION_SNR * 2;
    const barBg = new Rectangle(0, 0, barWidth, barHeight, {
      cornerRadius: 3,
      fill: GravitationalWavesColors.chartBackgroundColorProperty,
      stroke: GravitationalWavesColors.chartBorderColorProperty,
    });
    const barFill = new Rectangle(0, 0, 1, barHeight, {
      cornerRadius: 3,
      fill: GravitationalWavesColors.chirpSignalColorProperty,
    });
    const thresholdX = (CHIRP_DETECTION_SNR / snrScaleMax) * barWidth;
    const thresholdTick = new Line(thresholdX, -2, thresholdX, barHeight + 2, {
      stroke: GravitationalWavesColors.textColorProperty,
      lineWidth: 1.5,
    });
    const thresholdLabel = new Text(String(CHIRP_DETECTION_SNR), {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      centerX: thresholdX,
      bottom: -3,
    });
    const bar = new Node({ children: [barBg, barFill, thresholdTick, thresholdLabel] });

    const badgeText = new Text("", {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.chirpBadgeTextColorProperty,
      maxWidth: 110,
    });
    const badgeBg = new Rectangle(0, 0, 10, 22, { cornerRadius: 4 });
    const badge = new Node({ children: [badgeBg, badgeText] });

    const snrRow = new HBox({
      spacing: 8,
      align: "center",
      children: [bar, badge],
    });

    const catalogLine = new Text(catalogValueProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: CHIRP_READOUTS_WIDTH - 28,
    });
    const snrNote = new Text(strings.snrNoteStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: CHIRP_READOUTS_WIDTH - 28,
    });

    const catalogBlock = new VBox({
      spacing: 2,
      align: "left",
      children: [catalogLine, snrNote],
    });

    const content = new VBox({
      spacing: 6,
      align: "left",
      excludeInvisibleChildrenFromBounds: true,
      children: [title, grid, snrRow, catalogBlock],
    });

    // Do not set maxWidth on the Panel — Scenery would scale the whole panel.
    super(content, { xMargin: 10, yMargin: 8 });

    const badgeLink = Multilink.multilink(
      [
        model.isDetectedProperty,
        strings.detectedStringProperty,
        strings.belowThresholdStringProperty,
        GravitationalWavesColors.chirpDetectedColorProperty,
        GravitationalWavesColors.chirpBelowThresholdColorProperty,
      ],
      (detected, detectedStr, belowStr, detectedColor, belowColor) => {
        badgeText.string = detected ? detectedStr : belowStr;
        badgeBg.fill = detected ? detectedColor : belowColor;
        badgeBg.rectWidth = Math.max(48, badgeText.width + 14);
        badgeBg.rectHeight = Math.max(22, badgeText.height + 6);
        badgeText.center = badgeBg.center;
      },
    );

    const barLink = Multilink.multilink([model.recoveredSnrProperty], (snr) => {
      const frac = Math.max(0, Math.min(1, snr / snrScaleMax));
      barFill.rectWidth = Math.max(1, frac * barWidth);
      barFill.fill =
        snr >= CHIRP_DETECTION_SNR
          ? GravitationalWavesColors.chirpDetectedColorProperty.value
          : GravitationalWavesColors.chirpSignalColorProperty.value;
    });

    const catalogVisible = Multilink.multilink([model.catalogNetworkSnrProperty], (snr) => {
      catalogBlock.visible = snr !== null;
    });

    this.disposePanel = () => {
      badgeLink.dispose();
      barLink.dispose();
      catalogVisible.dispose();
      // Panel.dispose() does not dispose content; Text / RichText link to strings and DerivedProperties.
      content.disposeSubtree();
      chirpMassValueProperty.dispose();
      timeInBandValueProperty.dispose();
      fIscoValueProperty.dispose();
      optimalValueProperty.dispose();
      recoveredValueProperty.dispose();
      catalogValueProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposePanel();
    super.dispose();
  }
}
