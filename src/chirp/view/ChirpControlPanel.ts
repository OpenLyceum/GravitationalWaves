/**
 * ChirpControlPanel.ts
 *
 * Source combo, mass/distance sliders, display toggles, noise / play buttons.
 */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, type Node, Text, VBox } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import { Checkbox, ComboBox, RectangularPushButton } from "scenerystack/sun";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  GRAVITATIONAL_WAVES_COMBO_BOX_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/GravitationalWavesButtonOptions.js";
import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
import { LABEL_FONT, SMALL_FONT, TITLE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import { chirpNumberControlOptions, createLogNumberControl } from "../../common/view/themedNumberControl.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  CHIRP_DISTANCE_RANGE,
  CHIRP_MASS_RANGE,
  CHIRP_PANEL_WIDTH,
  PANEL_SPACING,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { ChirpModel, ChirpSourceId } from "../model/ChirpModel.js";
import type { ChirpAudioPlayer } from "./ChirpAudioPlayer.js";

export class ChirpControlPanel extends GravitationalWavesPanel {
  public readonly sourceCombo: ComboBox<ChirpSourceId>;
  public readonly mass1Control: NumberControl;
  public readonly mass2Control: NumberControl;
  public readonly distanceControl: NumberControl;
  public readonly showL1Checkbox: Checkbox;
  public readonly showHiddenSignalCheckbox: Checkbox;
  public readonly showTemplateCheckbox: Checkbox;
  public readonly showFrequencyTrackCheckbox: Checkbox;
  public readonly newNoiseButton: RectangularPushButton;
  public readonly playChirpButton: RectangularPushButton;
  private readonly disposeExtras: () => void;

  public constructor(model: ChirpModel, listParent: Node, audio: ChirpAudioPlayer) {
    const strings = StringManager.getInstance().getChirpStrings();
    const a11y = StringManager.getInstance().getChirpA11yStrings();

    const title = new Text(strings.controlsTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: CHIRP_PANEL_WIDTH - 24,
    });

    const sourceLabel = new Text(strings.sourceStringProperty, {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: 200,
    });

    const comboItems = [
      {
        value: "custom" as ChirpSourceId,
        accessibleName: strings.customStringProperty,
        createNode: () =>
          new Text(strings.customStringProperty, {
            font: SMALL_FONT,
            fill: LIGHT_SURFACE_TEXT_FILL,
            maxWidth: 200,
          }),
      },
      ...model.catalog.map((event) => {
        const labelProperty = new DerivedProperty([strings.eventOptionStringProperty], (pattern) =>
          StringUtils.fillIn(pattern, {
            name: event.name,
            catalog: event.catalog,
            distance: toFixed(event.distanceMpc, 0),
          }),
        );
        return {
          value: event.id as ChirpSourceId,
          accessibleName: labelProperty,
          createNode: () =>
            new Text(labelProperty, {
              font: SMALL_FONT,
              fill: LIGHT_SURFACE_TEXT_FILL,
              maxWidth: 200,
            }),
        };
      }),
    ];

    const sourceCombo = new ComboBox(model.sourceProperty, comboItems, listParent, {
      ...GRAVITATIONAL_WAVES_COMBO_BOX_OPTIONS,
      accessibleName: a11y.controls.sourceStringProperty,
      listPosition: "below",
      maxWidth: CHIRP_PANEL_WIDTH - 28,
    });

    const credit = new Text(strings.gwoscCreditStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: CHIRP_PANEL_WIDTH - 28,
    });

    const mass1Control = new NumberControl(strings.mass1StringProperty, model.m1Property, CHIRP_MASS_RANGE, {
      ...chirpNumberControlOptions(strings.massPatternStringProperty, 1),
      delta: 0.5,
      accessibleName: a11y.controls.mass1StringProperty,
    });
    const mass2Control = new NumberControl(strings.mass2StringProperty, model.m2Property, CHIRP_MASS_RANGE, {
      ...chirpNumberControlOptions(strings.massPatternStringProperty, 1),
      delta: 0.5,
      accessibleName: a11y.controls.mass2StringProperty,
    });
    const distance = createLogNumberControl(
      strings.distanceStringProperty,
      model.distanceProperty,
      CHIRP_DISTANCE_RANGE,
      strings.distancePatternStringProperty,
      { decimalPlaces: 0, accessibleName: a11y.controls.distanceStringProperty, compact: true },
    );

    const checkLabel = (property: TReadOnlyProperty<string>) =>
      new Text(property, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.textColorProperty,
        maxWidth: 180,
      });
    const checkOpts = {
      checkboxColor: GravitationalWavesColors.textColorProperty,
      checkboxColorBackground: GravitationalWavesColors.panelBackgroundColorProperty,
      boxWidth: 16,
    };

    const showL1Checkbox = new Checkbox(model.showL1Property, checkLabel(strings.showL1StringProperty), {
      ...checkOpts,
      accessibleName: a11y.controls.showL1StringProperty,
    });
    const showHiddenSignalCheckbox = new Checkbox(
      model.showHiddenSignalProperty,
      checkLabel(strings.showHiddenSignalStringProperty),
      { ...checkOpts, accessibleName: a11y.controls.showHiddenSignalStringProperty },
    );
    const showTemplateCheckbox = new Checkbox(
      model.showTemplateProperty,
      checkLabel(strings.showTemplateStringProperty),
      { ...checkOpts, accessibleName: a11y.controls.showTemplateStringProperty },
    );
    const showFrequencyTrackCheckbox = new Checkbox(
      model.showFrequencyTrackProperty,
      checkLabel(strings.showFrequencyTrackStringProperty),
      { ...checkOpts, accessibleName: a11y.controls.showFrequencyTrackStringProperty },
    );

    const buttonText = (property: TReadOnlyProperty<string>) =>
      new Text(property, { font: SMALL_FONT, fill: LIGHT_SURFACE_TEXT_FILL, maxWidth: 100 });

    const newNoiseButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: buttonText(strings.newNoiseStringProperty),
      listener: () => model.newNoise(),
      accessibleName: a11y.controls.newNoiseStringProperty,
      maxWidth: 110,
    });
    const playChirpButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: buttonText(strings.playChirpStringProperty),
      listener: () => audio.playChirp(),
      accessibleName: a11y.controls.playChirpStringProperty,
      maxWidth: 110,
    });

    const content = new VBox({
      spacing: Math.max(4, PANEL_SPACING - 2),
      align: "left",
      children: [
        title,
        sourceLabel,
        sourceCombo,
        credit,
        mass1Control,
        mass2Control,
        distance.control,
        showL1Checkbox,
        showHiddenSignalCheckbox,
        showTemplateCheckbox,
        showFrequencyTrackCheckbox,
        new HBox({ spacing: 8, children: [newNoiseButton, playChirpButton] }),
      ],
    });

    // Never set maxWidth/maxHeight on the Panel — Scenery scales the node to fit.
    super(content, { xMargin: 10, yMargin: 8 });

    this.sourceCombo = sourceCombo;
    this.mass1Control = mass1Control;
    this.mass2Control = mass2Control;
    this.distanceControl = distance.control;
    this.showL1Checkbox = showL1Checkbox;
    this.showHiddenSignalCheckbox = showHiddenSignalCheckbox;
    this.showTemplateCheckbox = showTemplateCheckbox;
    this.showFrequencyTrackCheckbox = showFrequencyTrackCheckbox;
    this.newNoiseButton = newNoiseButton;
    this.playChirpButton = playChirpButton;

    this.disposeExtras = () => {
      distance.dispose();
      for (const item of comboItems) {
        if (item.value !== "custom") {
          (item.accessibleName as { dispose?: () => void }).dispose?.();
        }
      }
    };
  }

  public override dispose(): void {
    this.disposeExtras();
    super.dispose();
  }
}
