/**
 * InterferometerScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createInterferometerIcon() in src/common/GravitationalWavesScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createInterferometerIcon } from "../common/GravitationalWavesScreenIcons.js";
import GravitationalWavesColors from "../GravitationalWavesColors.js";
import { InterferometerModel } from "./model/InterferometerModel.js";
import { InterferometerKeyboardHelpContent } from "./view/InterferometerKeyboardHelpContent.js";
import { InterferometerScreenView } from "./view/InterferometerScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type InterferometerScreenOptions = ScreenOptions & { tandem: Tandem };

export class InterferometerScreen extends Screen<InterferometerModel, InterferometerScreenView> {
  public constructor(options: InterferometerScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new InterferometerModel(),
      // View factory — receives the model instance
      (model) =>
        new InterferometerScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<InterferometerScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: GravitationalWavesColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new InterferometerKeyboardHelpContent(),
          homeScreenIcon: createInterferometerIcon(),
          navigationBarIcon: createInterferometerIcon(),
        },
        options,
      ),
    );
  }
}
