/**
 * GravitationalWavesPanel.ts
 *
 * A pre-themed Panel that automatically uses GravitationalWavesColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { GravitationalWavesPanel } from "../../common/GravitationalWavesPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new GravitationalWavesPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new GravitationalWavesPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new GravitationalWavesPanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import GravitationalWavesColors from "../GravitationalWavesColors.js";
import { PANEL_CORNER_RADIUS } from "../GravitationalWavesConstants.js";

/** @public */
export type GravitationalWavesPanelOptions = PanelOptions;

/** Pre-themed Panel wrapper for control panels and info boxes. @public */
export class GravitationalWavesPanel extends Panel {
  public constructor(content: Node, providedOptions?: GravitationalWavesPanelOptions) {
    const options = optionize<GravitationalWavesPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: GravitationalWavesColors.panelBackgroundColorProperty,
        stroke: GravitationalWavesColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: 12,
        yMargin: 10,
      },
      providedOptions,
    );
    super(content, options);
  }
}
