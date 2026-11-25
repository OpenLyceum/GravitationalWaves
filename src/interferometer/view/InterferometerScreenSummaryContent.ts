/**
 * InterferometerScreenSummaryContent.ts
 *
 * Accessible screen summary with a live current-details paragraph.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { formatScientific } from "../../common/view/scientificFormat.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { InterferometerModel } from "../model/InterferometerModel.js";

export class InterferometerScreenSummaryContent extends ScreenSummaryContent {
  private readonly disposeSummary: () => void;

  public constructor(model: InterferometerModel) {
    const a11y = StringManager.getInstance().getInterferometerA11yStrings();

    const currentDetailsProperty = new DerivedProperty(
      [
        model.armLengthKmProperty,
        model.fabryPerotProperty,
        model.thetaProperty,
        model.detectorResponseProperty,
        model.laserPowerProperty,
        a11y.currentDetailsStringProperty,
      ],
      (arm, fp, theta, response, _power, pattern) => {
        const best = model.bestSensitivity();
        return StringUtils.fillIn(pattern, {
          arm: toFixed(arm, 1),
          fp: fp ? "on" : "off",
          theta: toFixed(theta, 0),
          response: toFixed(response, 3),
          best: formatScientific(best.asd, 1),
        });
      },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetailsProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });

    this.disposeSummary = () => {
      const children = this.children.slice();
      for (const child of children) {
        if (!child.isDisposed) {
          child.disposeSubtree();
        }
      }
      currentDetailsProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposeSummary();
    super.dispose();
  }
}
