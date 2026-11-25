/**
 * ChirpScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createChirpIcon() in src/common/GravitationalWavesScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createChirpIcon } from "../common/GravitationalWavesScreenIcons.js";
import GravitationalWavesColors from "../GravitationalWavesColors.js";
import { ChirpModel } from "./model/ChirpModel.js";
import { ChirpKeyboardHelpContent } from "./view/ChirpKeyboardHelpContent.js";
import { ChirpScreenView } from "./view/ChirpScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type ChirpScreenOptions = ScreenOptions & { tandem: Tandem };

export class ChirpScreen extends Screen<ChirpModel, ChirpScreenView> {
  public constructor(options: ChirpScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new ChirpModel(),
      // View factory — receives the model instance
      (model) =>
        new ChirpScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ChirpScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: GravitationalWavesColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ChirpKeyboardHelpContent(),
          homeScreenIcon: createChirpIcon(),
          navigationBarIcon: createChirpIcon(),
        },
        options,
      ),
    );
  }
}
