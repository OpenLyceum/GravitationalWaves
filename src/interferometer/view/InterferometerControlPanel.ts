/**
 * InterferometerControlPanel.ts
 *
 * Arm length, cavities, laser power, noise toggles, sky angles, polarization,
 * blind-spot preset, and time controls.
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { Text, VBox } from "scenerystack/scenery";
import { NumberControl, TimeControlNode } from "scenerystack/scenery-phet";
import { AquaRadioButtonGroup, Checkbox, RectangularPushButton } from "scenerystack/sun";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/GravitationalWavesButtonOptions.js";
import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
import { LABEL_FONT, SMALL_FONT, TITLE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import { createLogNumberControl, panelNumberControlOptions } from "../../common/view/themedNumberControl.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  ARM_LENGTH_KM_RANGE,
  LASER_POWER_RANGE,
  PANEL_SPACING,
  PSI_DEG_RANGE,
  STEP_DT,
  THETA_DEG_RANGE,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { InterferometerModel } from "../model/InterferometerModel.js";

export class InterferometerControlPanel extends GravitationalWavesPanel {
  public readonly armLengthControl: NumberControl;
  public readonly fabryCheckbox: Checkbox;
  public readonly laserControl: NumberControl;
  public readonly seismicCheckbox: Checkbox;
  public readonly thermalCheckbox: Checkbox;
  public readonly shotCheckbox: Checkbox;
  public readonly realCurveCheckbox: Checkbox;
  public readonly thetaControl: NumberControl;
  public readonly psiControl: NumberControl;
  public readonly polarizationGroup: AquaRadioButtonGroup<string>;
  public readonly blindSpotButton: RectangularPushButton;
  public readonly timeControl: TimeControlNode;
  private readonly disposeExtras: () => void;

  public constructor(model: InterferometerModel) {
    const strings = StringManager.getInstance().getInterferometerStrings();
    const a11y = StringManager.getInstance().getInterferometerA11yStrings();

    const title = new Text(strings.controlsTitleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: 200,
    });

    const armLengthControl = new NumberControl(
      strings.armLengthStringProperty,
      model.armLengthKmProperty,
      ARM_LENGTH_KM_RANGE,
      {
        ...panelNumberControlOptions(strings.armLengthPatternStringProperty, 1),
        delta: 0.1,
        accessibleName: a11y.controls.armLengthStringProperty,
      },
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

    const fabryCheckbox = new Checkbox(model.fabryPerotProperty, checkLabel(strings.fabryPerotStringProperty), {
      ...checkOpts,
      accessibleName: a11y.controls.fabryPerotStringProperty,
    });

    const laser = createLogNumberControl(
      strings.laserPowerStringProperty,
      model.laserPowerProperty,
      LASER_POWER_RANGE,
      strings.laserPowerPatternStringProperty,
      { decimalPlaces: 2, accessibleName: a11y.controls.laserPowerStringProperty },
    );
    const laserControl = laser.control;

    const seismicCheckbox = new Checkbox(model.seismicEnabledProperty, checkLabel(strings.noiseSeismicStringProperty), {
      ...checkOpts,
      accessibleName: a11y.controls.noiseSeismicStringProperty,
    });
    const thermalCheckbox = new Checkbox(model.thermalEnabledProperty, checkLabel(strings.noiseThermalStringProperty), {
      ...checkOpts,
      accessibleName: a11y.controls.noiseThermalStringProperty,
    });
    const shotCheckbox = new Checkbox(model.shotEnabledProperty, checkLabel(strings.noiseShotStringProperty), {
      ...checkOpts,
      accessibleName: a11y.controls.noiseShotStringProperty,
    });
    const realCurveCheckbox = new Checkbox(
      model.showRealCurveProperty,
      checkLabel(strings.showRealCurveStringProperty),
      {
        ...checkOpts,
        accessibleName: a11y.controls.showRealCurveStringProperty,
      },
    );

    const thetaControl = new NumberControl(strings.thetaStringProperty, model.thetaProperty, THETA_DEG_RANGE, {
      ...panelNumberControlOptions(strings.degreesPatternStringProperty, 0),
      delta: 1,
      accessibleName: a11y.controls.thetaStringProperty,
    });
    const psiControl = new NumberControl(strings.psiStringProperty, model.psiProperty, PSI_DEG_RANGE, {
      ...panelNumberControlOptions(strings.degreesPatternStringProperty, 0),
      delta: 1,
      accessibleName: a11y.controls.psiStringProperty,
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

    const blindSpotButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(strings.blindSpotStringProperty, {
        font: SMALL_FONT,
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: 160,
      }),
      listener: () => model.activateBlindSpot(),
      accessibleName: a11y.controls.blindSpotStringProperty,
    });

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: [...model.timer.timeSpeeds],
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => model.stepOnce(STEP_DT),
        },
      },
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
    });

    const content = new VBox({
      align: "left",
      spacing: Math.max(4, PANEL_SPACING - 2),
      children: [
        title,
        armLengthControl,
        fabryCheckbox,
        laserControl,
        seismicCheckbox,
        thermalCheckbox,
        shotCheckbox,
        realCurveCheckbox,
        thetaControl,
        psiControl,
        polarizationGroup,
        blindSpotButton,
        timeControl,
      ],
    });

    super(content, { isDisposable: false, xMargin: 10, yMargin: 8 });

    this.armLengthControl = armLengthControl;
    this.fabryCheckbox = fabryCheckbox;
    this.laserControl = laserControl;
    this.seismicCheckbox = seismicCheckbox;
    this.thermalCheckbox = thermalCheckbox;
    this.shotCheckbox = shotCheckbox;
    this.realCurveCheckbox = realCurveCheckbox;
    this.thetaControl = thetaControl;
    this.psiControl = psiControl;
    this.polarizationGroup = polarizationGroup;
    this.blindSpotButton = blindSpotButton;
    this.timeControl = timeControl;
    this.disposeExtras = () => laser.dispose();
  }

  public override dispose(): void {
    this.disposeExtras();
    super.dispose();
  }
}
