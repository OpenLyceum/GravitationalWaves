/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { ChirpScreen } from "./chirp/ChirpScreen.js";
import GravitationalWavesColors from "./GravitationalWavesColors.js";
import { StringManager } from "./i18n/StringManager.js";
import { InterferometerScreen } from "./interferometer/InterferometerScreen.js";
import { NetworkScreen } from "./network/NetworkScreen.js";
import { GravitationalWavesPreferencesModel } from "./preferences/GravitationalWavesPreferencesModel.js";
import { GravitationalWavesPreferencesNode } from "./preferences/GravitationalWavesPreferencesNode.js";
import { WavesScreen } from "./waves/WavesScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  // Simulation-specific preferences; initial values come from gravitationalWavesQueryParameters.
  const simPreferences = new GravitationalWavesPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new WavesScreen({
      name: stringManager.getScreenNames().wavesStringProperty,
      tandem: Tandem.ROOT.createTandem("wavesScreen"),
      backgroundColorProperty: GravitationalWavesColors.backgroundColorProperty,
    }),
    new InterferometerScreen({
      name: stringManager.getScreenNames().interferometerStringProperty,
      tandem: Tandem.ROOT.createTandem("interferometerScreen"),
      backgroundColorProperty: GravitationalWavesColors.backgroundColorProperty,
    }),
    new ChirpScreen({
      name: stringManager.getScreenNames().chirpStringProperty,
      tandem: Tandem.ROOT.createTandem("chirpScreen"),
      backgroundColorProperty: GravitationalWavesColors.backgroundColorProperty,
    }),
    new NetworkScreen({
      name: stringManager.getScreenNames().networkStringProperty,
      tandem: Tandem.ROOT.createTandem("networkScreen"),
      backgroundColorProperty: GravitationalWavesColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      audioOptions: {
        // Initializes tambo; pair with supportsSound in init.ts
        supportsSound: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new GravitationalWavesPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
