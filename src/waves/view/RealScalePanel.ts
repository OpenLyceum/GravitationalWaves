/**
 * RealScalePanel.ts
 *
 * Real-strain log slider, baseline radio, and ΔL comparison readout.
 */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { RichText, Text, VBox } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import { AquaRadioButtonGroup } from "scenerystack/sun";
import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
import { LABEL_FONT, SMALL_FONT, TITLE_FONT } from "../../common/view/GravitationalWavesFonts.js";
import { formatComparisonFactor, formatScientific } from "../../common/view/scientificFormat.js";
import { panelNumberControlOptions } from "../../common/view/themedNumberControl.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import {
  ATOM_SIZE_M,
  PANEL_SPACING,
  PROTON_SIZE_M,
  REAL_STRAIN_EXPONENT_RANGE,
} from "../../GravitationalWavesConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { WavesModel } from "../model/WavesModel.js";

export class RealScalePanel extends GravitationalWavesPanel {
  public readonly strainControl: NumberControl;
  public readonly baselineGroup: AquaRadioButtonGroup<string>;
  private readonly disposePanel: () => void;

  public constructor(model: WavesModel) {
    const strings = StringManager.getInstance().getWavesStrings();
    const a11y = StringManager.getInstance().getWavesA11yStrings();

    const title = new Text(strings.realScaleStringProperty, {
      font: TITLE_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: 200,
    });

    const baseDisplay = panelNumberControlOptions(undefined, 0).numberDisplayOptions;
    const strainControl = new NumberControl(
      strings.realStrainStringProperty,
      model.realStrainExponentProperty,
      REAL_STRAIN_EXPONENT_RANGE,
      {
        ...panelNumberControlOptions(undefined, 0),
        delta: 0.1,
        numberDisplayOptions: {
          ...baseDisplay,
          useRichText: true,
          minBackgroundWidth: 128,
          numberFormatter: (exp: number) => formatScientific(10 ** exp, 1),
        },
        accessibleName: a11y.controls.realStrainStringProperty,
      },
    );

    const baselineLabel = (property: TReadOnlyProperty<string>) =>
      new Text(property, {
        font: SMALL_FONT,
        fill: GravitationalWavesColors.textColorProperty,
        maxWidth: 180,
      });

    const baselineGroup = new AquaRadioButtonGroup(
      model.baselineProperty,
      [
        {
          value: "meter",
          createNode: () => baselineLabel(strings.baselineMeterStringProperty),
          options: { accessibleName: strings.baselineMeterStringProperty },
        },
        {
          value: "ligo",
          createNode: () => baselineLabel(strings.baselineLigoStringProperty),
          options: { accessibleName: strings.baselineLigoStringProperty },
        },
        {
          value: "earthSun",
          createNode: () => baselineLabel(strings.baselineEarthSunStringProperty),
          options: { accessibleName: strings.baselineEarthSunStringProperty },
        },
      ],
      {
        orientation: "vertical",
        spacing: 4,
        radioButtonOptions: { radius: 7 },
        accessibleName: a11y.controls.baselineStringProperty,
        labelTagName: "h3",
      },
    );

    const baselineHeading = new Text(strings.baselineStringProperty, {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: 200,
    });

    const deltaLStringProperty = new DerivedProperty(
      [model.deltaLProperty, strings.deltaLValueStringProperty],
      (deltaL, pattern) => StringUtils.fillIn(pattern, { value: formatScientific(deltaL, 2) }),
    );

    const compareStringProperty = new DerivedProperty(
      [
        model.deltaLProperty,
        strings.compareAtomStringProperty,
        strings.compareSmallerThanAtomStringProperty,
        strings.compareSmallerThanProtonStringProperty,
      ],
      (deltaL, atom, smallerAtom, smallerProton) => {
        const mag = Math.abs(deltaL);
        if (mag >= ATOM_SIZE_M) {
          return atom;
        }
        if (mag >= PROTON_SIZE_M) {
          const factor = ATOM_SIZE_M / Math.max(mag, Number.MIN_VALUE);
          return StringUtils.fillIn(smallerAtom, { factor: formatComparisonFactor(factor) });
        }
        const factor = PROTON_SIZE_M / Math.max(mag, Number.MIN_VALUE);
        return StringUtils.fillIn(smallerProton, { factor: formatComparisonFactor(factor) });
      },
    );

    const deltaHeading = new Text(strings.deltaLStringProperty, {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
    });
    const deltaValue = new RichText(deltaLStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.accentColorProperty,
      maxWidth: 200,
    });
    const compare = new Text(compareStringProperty, {
      font: SMALL_FONT,
      fill: GravitationalWavesColors.mutedTextColorProperty,
      maxWidth: 200,
    });

    const content = new VBox({
      align: "left",
      spacing: PANEL_SPACING,
      children: [title, strainControl, baselineHeading, baselineGroup, deltaHeading, deltaValue, compare],
    });

    super(content, { isDisposable: false });

    this.strainControl = strainControl;
    this.baselineGroup = baselineGroup;
    this.disposePanel = () => {
      deltaLStringProperty.dispose();
      compareStringProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposePanel();
    super.dispose();
  }
}
