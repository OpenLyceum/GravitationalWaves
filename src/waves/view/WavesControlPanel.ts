/**
 * WavesControlPanel.ts
 *
 * Polarization, exaggeration, and frequency controls for the Waves screen.
 * Playback lives under the ring (TimeControlNode in WavesScreenView).
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { RichText, Text, VBox } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import { AquaRadioButtonGroup } from "scenerystack/sun";
import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
import { LABEL_FONT, SMALL_FONT, TITLE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import { panelNumberControlOptions } from "../../common/view/themedNumberControl.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { PANEL_SPACING, VISUAL_STRAIN_RANGE, WAVES_FREQUENCY_RANGE } from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { WavesModel } from "../model/WavesModel.js";

export class WavesControlPanel extends GravitationalWavesPanel {
  public readonly polarizationGroup: AquaRadioButtonGroup<string>;
  public readonly exaggerationControl: NumberControl;
  public readonly frequencyControl: NumberControl;

  public constructor(model: WavesModel) {
    const strings = StringManager.getInstance().getWavesStrings();
    const a11y = StringManager.getInstance().getWavesA11yStrings();

    const title = new Text(strings.controlsTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: 200,
    });

    const polLabel = (property: TReadOnlyProperty<string>) =>
      new Text(property, { font: LABEL_FONT, fill: GravitationalWavesColors.textColorProperty });

    const polarizationGroup = new AquaRadioButtonGroup(
      model.polarizationProperty,
      [
        {
          value: "plus",
          createNode: () => polLabel(strings.plusStringProperty),
          options: { accessibleName: strings.plusStringProperty },
        },
        {
          value: "cross",
          createNode: () => polLabel(strings.crossStringProperty),
          options: { accessibleName: strings.crossStringProperty },
        },
      ],
      {
        orientation: "horizontal",
        spacing: 16,
        radioButtonOptions: { radius: 8 },
        accessibleName: a11y.controls.polarizationStringProperty,
        labelTagName: "h3",
      },
    );

    const polHeading = new Text(strings.polarizationStringProperty, {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: 200,
    });

    const exaggerationControl = new NumberControl(
      strings.exaggerationStringProperty,
      model.visualStrainProperty,
      VISUAL_STRAIN_RANGE,
      {
        ...panelNumberControlOptions(undefined, 2),
        delta: 0.01,
        accessibleName: a11y.controls.exaggerationStringProperty,
      },
    );

    const exaggerationNote = new RichText(strings.exaggerationNoteStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: 200,
    });

    const frequencyControl = new NumberControl(
      strings.frequencyStringProperty,
      model.frequencyProperty,
      WAVES_FREQUENCY_RANGE,
      {
        ...panelNumberControlOptions(strings.hzPatternStringProperty, 2),
        delta: 0.05,
        accessibleName: a11y.controls.frequencyStringProperty,
      },
    );

    const content = new VBox({
      align: "left",
      spacing: PANEL_SPACING,
      children: [title, polHeading, polarizationGroup, exaggerationControl, exaggerationNote, frequencyControl],
    });

    super(content, { isDisposable: false });

    this.polarizationGroup = polarizationGroup;
    this.exaggerationControl = exaggerationControl;
    this.frequencyControl = frequencyControl;
  }
}
