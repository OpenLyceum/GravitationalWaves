/**
 * Shared Okabe–Ito detector colour lookup for the Network screen.
 */
import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Color } from "scenerystack/scenery";
import type { DetectorId } from "../../common/model/DetectorNetwork.js";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";

export function detectorColorProperty(id: DetectorId): TReadOnlyProperty<Color | string> {
  switch (id) {
    case "H1":
      return GravitationalWavesColors.networkH1ColorProperty;
    case "L1":
      return GravitationalWavesColors.networkL1ColorProperty;
    case "V1":
      return GravitationalWavesColors.networkV1ColorProperty;
    case "K1":
      return GravitationalWavesColors.networkK1ColorProperty;
  }
}
