/**
 * WavesScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createWavesIcon() in src/common/GravitationalWavesScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createWavesIcon } from "../common/GravitationalWavesScreenIcons.js";
import GravitationalWavesColors from "../GravitationalWavesColors.js";
import { WavesModel } from "./model/WavesModel.js";
import { WavesKeyboardHelpContent } from "./view/WavesKeyboardHelpContent.js";
import { WavesScreenView } from "./view/WavesScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type WavesScreenOptions = ScreenOptions & { tandem: Tandem };

export class WavesScreen extends Screen<WavesModel, WavesScreenView> {
  public constructor(options: WavesScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new WavesModel(),
      // View factory — receives the model instance
      (model) =>
        new WavesScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<WavesScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: GravitationalWavesColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new WavesKeyboardHelpContent(),
          homeScreenIcon: createWavesIcon(),
          navigationBarIcon: createWavesIcon(),
        },
        options,
      ),
    );
  }
}
