/**
 * NetworkScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createNetworkIcon() in src/common/GravitationalWavesScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createNetworkIcon } from "../common/GravitationalWavesScreenIcons.js";
import GravitationalWavesColors from "../GravitationalWavesColors.js";
import { NetworkModel } from "./model/NetworkModel.js";
import { NetworkKeyboardHelpContent } from "./view/NetworkKeyboardHelpContent.js";
import { NetworkScreenView } from "./view/NetworkScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type NetworkScreenOptions = ScreenOptions & { tandem: Tandem };

export class NetworkScreen extends Screen<NetworkModel, NetworkScreenView> {
  public constructor(options: NetworkScreenOptions) {
    super(
      () => new NetworkModel(),
      (model) =>
        new NetworkScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<NetworkScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: GravitationalWavesColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new NetworkKeyboardHelpContent(),
          homeScreenIcon: createNetworkIcon(),
          navigationBarIcon: createNetworkIcon(),
        },
        options,
      ),
    );
  }
}
