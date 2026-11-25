/**
 * WavesScreenSummaryContent.ts
 *
 * Accessible screen summary with a live current-details paragraph.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { formatScientific } from "../../common/view/scientificFormat.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { WavesModel } from "../model/WavesModel.js";

export class WavesScreenSummaryContent extends ScreenSummaryContent {
  private readonly disposeSummary: () => void;

  public constructor(model: WavesModel) {
    const a11y = StringManager.getInstance().getWavesA11yStrings();
    const strings = StringManager.getInstance().getWavesStrings();

    const currentDetailsProperty = new DerivedProperty(
      [
        model.polarizationProperty,
        model.visualStrainProperty,
        model.frequencyProperty,
        model.deltaLProperty,
        a11y.currentDetailsStringProperty,
        strings.plusStringProperty,
        strings.crossStringProperty,
      ],
      (pol, strain, frequency, deltaL, pattern, plus, cross) =>
        StringUtils.fillIn(pattern, {
          polarization: pol === "plus" ? plus : cross,
          strain: toFixed(strain, 2),
          frequency: toFixed(frequency, 2),
          deltaL: formatScientific(deltaL, 2),
        }),
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetailsProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });

    this.disposeSummary = () => currentDetailsProperty.dispose();
  }

  public override dispose(): void {
    this.disposeSummary();
    super.dispose();
  }
}
