/**
 * ChirpScreenSummaryContent.ts
 *
 * Accessible screen summary with a live current-details paragraph.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ChirpModel } from "../model/ChirpModel.js";

export class ChirpScreenSummaryContent extends ScreenSummaryContent {
  private readonly disposeSummary: () => void;

  public constructor(model: ChirpModel) {
    const a11y = StringManager.getInstance().getChirpA11yStrings();
    const strings = StringManager.getInstance().getChirpStrings();

    const currentDetailsProperty = new DerivedProperty(
      [
        model.sourceProperty,
        model.chirpMassProperty,
        model.optimalSnrProperty,
        model.recoveredSnrProperty,
        a11y.currentDetailsStringProperty,
        strings.customStringProperty,
      ],
      (source, chirpMass, optimalSnr, recoveredSnr, pattern, custom) =>
        StringUtils.fillIn(pattern, {
          source: source === "custom" ? custom : source,
          chirpMass: toFixed(chirpMass, 2),
          optimalSnr: toFixed(optimalSnr, 1),
          recoveredSnr: toFixed(recoveredSnr, 1),
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
