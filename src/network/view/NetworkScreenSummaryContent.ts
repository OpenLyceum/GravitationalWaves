/**
 * NetworkScreenSummaryContent.ts
 *
 * Accessible screen summary with a live current-details paragraph.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import {
  cellCentre,
  densityAt,
  SKY_GRID_HEIGHT,
  SKY_GRID_STEP_DEG,
  SKY_GRID_WIDTH,
} from "../../common/model/SkyLocalization.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { NetworkModel } from "../model/NetworkModel.js";

export class NetworkScreenSummaryContent extends ScreenSummaryContent {
  private readonly disposeSummary: () => void;

  public constructor(model: NetworkModel) {
    const a11y = StringManager.getInstance().getNetworkA11yStrings();

    const currentDetailsProperty = new DerivedProperty(
      [
        model.readingsProperty,
        model.pairsProperty,
        model.skyMapProperty,
        model.sourcePositionProperty,
        model.truthKnownProperty,
        a11y.currentDetailsStringProperty,
        a11y.insideRegionStringProperty,
        a11y.outsideRegionStringProperty,
        a11y.unknownRegionStringProperty,
        a11y.noDelaysStringProperty,
      ],
      (readings, pairs, map, source, truthKnown, pattern, inside, outside, unknown, noDelays) => {
        const detectors = readings.length > 0 ? readings.map((r) => r.id).join(", ") : "—";
        const delays =
          pairs.length > 0
            ? pairs
                .map((pair) => {
                  const ms = pair.delay * 1e3;
                  const sign = ms >= 0 ? "+" : "−";
                  return `${pair.a}−${pair.b} ${sign}${toFixed(Math.abs(ms), 2)} ms`;
                })
                .join("; ")
            : noDelays;
        let insideText = unknown;
        if (truthKnown && map.density.length === SKY_GRID_WIDTH * SKY_GRID_HEIGHT && map.threshold90 > 0) {
          const column = Math.min(SKY_GRID_WIDTH - 1, Math.max(0, Math.floor((source.x + 180) / SKY_GRID_STEP_DEG)));
          const row = Math.min(SKY_GRID_HEIGHT - 1, Math.max(0, Math.floor((90 - source.y) / SKY_GRID_STEP_DEG)));
          const { lon, lat } = cellCentre(column, row);
          const d = densityAt(map, lon, lat);
          insideText = d >= map.threshold90 ? inside : outside;
        }
        return StringUtils.fillIn(pattern, {
          detectors,
          area: toFixed(map.area90, 0),
          delays,
          inside: insideText,
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
