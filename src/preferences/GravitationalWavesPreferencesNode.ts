/**
 * GravitationalWavesPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Add controls here
 * when the sim gains sim-specific preferences. The empty shell still wraps content
 * in GravitationalWavesPanel so the shared panel toolkit stays reachable.
 */
import { VBox } from "scenerystack/scenery";
import type { Tandem } from "scenerystack/tandem";
import { GravitationalWavesPanel } from "../common/GravitationalWavesPanel.js";
import GravitationalWavesNamespace from "../GravitationalWavesNamespace.js";
import type { GravitationalWavesPreferencesModel } from "./GravitationalWavesPreferencesModel.js";

export class GravitationalWavesPreferencesNode extends VBox {
  public constructor(_preferencesModel: GravitationalWavesPreferencesModel, _tandem?: Tandem) {
    // Pattern for a preference control (skill: scenerystack-preferences). The dialog is
    // always white, so use the controlSurface colors, not textColorProperty.
    //
    //   const prefStrings = StringManager.getInstance().getPreferences();
    //   const showGridCheckbox = new Checkbox(
    //     preferencesModel.showGridProperty,
    //     new Text(prefStrings.showGridStringProperty, {
    //       font: new PhetFont(14),
    //       fill: GravitationalWavesColors.controlSurfaceTextColorProperty,
    //     }),
    //     {
    //       // Shared slider / NumberControl / checkbox bundles live in GravitationalWavesControlOptions.ts:
    //       // copy the template's src/common/*ControlOptions.ts and apply the GravitationalWaves prefix.
    //       checkboxColor: GravitationalWavesColors.controlSurfaceTextColorProperty,
    //       checkboxColorBackground: GravitationalWavesColors.controlSurfaceColorProperty,
    //       ...(tandem && { tandem: tandem.createTandem("showGridCheckbox") }),
    //     },
    //   );
    //
    // Add showGridCheckbox to the content children below.
    const content = new VBox({
      align: "left",
      spacing: 12,
      children: [],
    });
    // Transparent / borderless so the Preferences dialog stays visually empty.
    const panel = new GravitationalWavesPanel(content, {
      fill: "transparent",
      stroke: null,
      xMargin: 0,
      yMargin: 0,
    });
    super({
      align: "left",
      spacing: 12,
      children: [panel],
    });
  }
}

GravitationalWavesNamespace.register("GravitationalWavesPreferencesNode", GravitationalWavesPreferencesNode);
