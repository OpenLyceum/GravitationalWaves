/**
 * NetworkControlPanel.ts
 *
 * Detector toggles, network SNR, noise, and display checkboxes.
 */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2 } from "scenerystack/dot";
import { HBox, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import { Checkbox, RectangularPushButton } from "scenerystack/sun";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/GravitationalWavesButtonOptions.js";
import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
import type { DetectorId } from "../../common/model/DetectorNetwork.js";
import { SMALL_FONT, TITLE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import { chirpNumberControlOptions } from "../../common/view/themedNumberControl.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { NETWORK_PANEL_WIDTH, NETWORK_SNR_RANGE } from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { NetworkModel } from "../model/NetworkModel.js";
import { detectorColorProperty } from "./networkDetectorColors.js";

const SNR_TRACK = new Dimension2(90, 4);

export class NetworkControlPanel extends GravitationalWavesPanel {
  public readonly snrControl: NumberControl;
  public readonly detectorCheckboxes: Readonly<Record<DetectorId, Checkbox>>;
  public readonly measurementNoiseCheckbox: Checkbox;
  public readonly newNoiseButton: RectangularPushButton;
  public readonly showRingsCheckbox: Checkbox;
  public readonly showTruthCheckbox: Checkbox;
  private readonly disposeExtras: () => void;

  public constructor(model: NetworkModel) {
    const strings = StringManager.getInstance().getNetworkStrings();
    const a11y = StringManager.getInstance().getNetworkA11yStrings();

    const title = new Text(strings.controlsTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: NETWORK_PANEL_WIDTH - 24,
    });

    const checkOpts = {
      checkboxColor: GravitationalWavesColors.textColorProperty,
      checkboxColorBackground: GravitationalWavesColors.panelBackgroundColorProperty,
      boxWidth: 16,
    };

    const detectorLabel = (id: DetectorId, property: TReadOnlyProperty<string>) =>
      new HBox({
        spacing: 6,
        children: [
          new Rectangle(0, 0, 12, 12, {
            fill: detectorColorProperty(id),
            stroke: GravitationalWavesColors.chartBorderColorProperty,
            cornerRadius: 2,
          }),
          new Text(property, {
            font: SMALL_FONT,
            fill: GravitationalWavesColors.textColorProperty,
            maxWidth: 140,
          }),
        ],
      });

    const detectorCheckboxes = {
      H1: new Checkbox(model.detectorEnabledProperties.H1, detectorLabel("H1", strings.detectorH1StringProperty), {
        ...checkOpts,
        accessibleName: a11y.controls.detectorH1StringProperty,
      }),
      L1: new Checkbox(model.detectorEnabledProperties.L1, detectorLabel("L1", strings.detectorL1StringProperty), {
        ...checkOpts,
        accessibleName: a11y.controls.detectorL1StringProperty,
      }),
      V1: new Checkbox(model.detectorEnabledProperties.V1, detectorLabel("V1", strings.detectorV1StringProperty), {
        ...checkOpts,
        accessibleName: a11y.controls.detectorV1StringProperty,
      }),
      K1: new Checkbox(model.detectorEnabledProperties.K1, detectorLabel("K1", strings.detectorK1StringProperty), {
        ...checkOpts,
        accessibleName: a11y.controls.detectorK1StringProperty,
      }),
    } as const;

    const snrOptions = chirpNumberControlOptions(strings.snrPatternStringProperty, 0);
    const snrControl = new NumberControl(
      strings.networkSnrStringProperty,
      model.networkSnrProperty,
      NETWORK_SNR_RANGE,
      {
        ...snrOptions,
        // Horizontal layout keeps the right column short enough for three-detector readouts.
        layoutFunction: NumberControl.createLayoutFunction1(),
        titleNodeOptions: {
          ...snrOptions.titleNodeOptions,
          maxWidth: 100,
        },
        sliderOptions: {
          ...snrOptions.sliderOptions,
          trackSize: SNR_TRACK,
        },
        delta: 1,
        accessibleName: a11y.controls.networkSnrStringProperty,
      },
    );

    const checkLabel = (property: TReadOnlyProperty<string>) =>
      new Text(property, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.textColorProperty,
        maxWidth: 180,
      });

    const measurementNoiseCheckbox = new Checkbox(
      model.measurementNoiseProperty,
      checkLabel(strings.measurementNoiseStringProperty),
      { ...checkOpts, accessibleName: a11y.controls.measurementNoiseStringProperty },
    );

    const newNoiseButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(strings.newNoiseStringProperty, {
        font: SMALL_FONT,
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: 100,
      }),
      listener: () => model.newNoise(),
      accessibleName: a11y.controls.newNoiseStringProperty,
      maxWidth: 110,
    });

    const showRingsCheckbox = new Checkbox(model.showRingsProperty, checkLabel(strings.showRingsStringProperty), {
      ...checkOpts,
      accessibleName: a11y.controls.showRingsStringProperty,
    });
    const showTruthCheckbox = new Checkbox(model.showTruthProperty, checkLabel(strings.showTruthStringProperty), {
      ...checkOpts,
      accessibleName: a11y.controls.showTruthStringProperty,
    });

    // Grey the noise controls slightly when a preset is selected (still editable → returns to custom).
    const noiseEnabledProperty = new DerivedProperty([model.sourceProperty], (source) => source === "custom");
    const noiseOpacityListener = (enabled: boolean) => {
      measurementNoiseCheckbox.opacity = enabled ? 1 : 0.55;
      newNoiseButton.opacity = enabled ? 1 : 0.55;
    };
    noiseEnabledProperty.link(noiseOpacityListener);

    const content = new VBox({
      spacing: 3,
      align: "left",
      children: [
        title,
        new HBox({
          spacing: 12,
          align: "top",
          children: [
            new VBox({
              spacing: 2,
              align: "left",
              children: [detectorCheckboxes.H1, detectorCheckboxes.L1],
            }),
            new VBox({
              spacing: 2,
              align: "left",
              children: [detectorCheckboxes.V1, detectorCheckboxes.K1],
            }),
          ],
        }),
        snrControl,
        new HBox({
          spacing: 8,
          align: "center",
          children: [measurementNoiseCheckbox, newNoiseButton],
        }),
        showRingsCheckbox,
        showTruthCheckbox,
      ],
    });

    super(content, { xMargin: 8, yMargin: 5 });

    this.snrControl = snrControl;
    this.detectorCheckboxes = detectorCheckboxes;
    this.measurementNoiseCheckbox = measurementNoiseCheckbox;
    this.newNoiseButton = newNoiseButton;
    this.showRingsCheckbox = showRingsCheckbox;
    this.showTruthCheckbox = showTruthCheckbox;

    this.disposeExtras = () => {
      noiseEnabledProperty.unlink(noiseOpacityListener);
      noiseEnabledProperty.dispose();
      content.disposeSubtree();
    };
  }

  public override dispose(): void {
    this.disposeExtras();
    super.dispose();
  }
}
