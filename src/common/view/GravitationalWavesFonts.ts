/**
 * Shared fonts for Gravitational Waves labels and readouts.
 */
import { Font } from "scenerystack/scenery";
import { LABEL_FONT_SIZE, SMALL_FONT_SIZE, TITLE_FONT_SIZE } from "../../GravitationalWavesConstants.js";

export const LABEL_FONT = new Font({ size: LABEL_FONT_SIZE });
export const TITLE_FONT = new Font({ size: TITLE_FONT_SIZE, weight: "bold" });
export const SMALL_FONT = new Font({ size: SMALL_FONT_SIZE });
