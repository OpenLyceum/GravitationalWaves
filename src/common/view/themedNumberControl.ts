/**
 * Themed NumberControl defaults for dark panels (and a logarithmic variant).
 */
import { NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, Range, toFixed } from "scenerystack/dot";
import { NumberControl, type NumberControlOptions } from "scenerystack/scenery-phet";
import GravitationalWavesColors from "../../GravitationalWavesColors.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../GravitationalWavesButtonOptions.js";
import { LABEL_FONT } from "./GravitationalWavesFonts.js";

const SLIDER_TRACK = new Dimension2(140, 4);
const SLIDER_THUMB = new Dimension2(12, 22);
const CHIRP_SLIDER_TRACK = new Dimension2(110, 4);

/** Wide enough for scientific RichText values like "1.0 × 10<sup>−21</sup>". */
const NUMBER_DISPLAY_MIN_WIDTH = 118;

/** Compact enough for "100.0 M☉" / "5000 Mpc" on the Chirp panels. */
const CHIRP_NUMBER_DISPLAY_MIN_WIDTH = 72;

/** Shared chrome so NumberControl titles/readouts stay readable on dark panels. */
export function panelNumberControlOptions(
  valuePattern?: TReadOnlyProperty<string>,
  decimalPlaces = 2,
): NumberControlOptions {
  return {
    layoutFunction: NumberControl.createLayoutFunction4(),
    titleNodeOptions: {
      font: LABEL_FONT,
      fill: GravitationalWavesColors.textColorProperty,
      maxWidth: 180,
    },
    numberDisplayOptions: {
      decimalPlaces,
      ...(valuePattern ? { valuePattern } : {}),
      minBackgroundWidth: NUMBER_DISPLAY_MIN_WIDTH,
      textOptions: {
        font: LABEL_FONT,
        fill: GravitationalWavesColors.controlSurfaceTextColorProperty,
      },
      backgroundFill: GravitationalWavesColors.controlSurfaceColorProperty,
      backgroundStroke: GravitationalWavesColors.panelBorderColorProperty,
    },
    sliderOptions: {
      trackSize: SLIDER_TRACK,
      thumbSize: SLIDER_THUMB,
    },
    arrowButtonOptions: { ...FLAT_RECTANGULAR_BUTTON_OPTIONS },
  };
}

/** Chirp-panel NumberControl chrome: shorter track, value box sized to content. */
export function chirpNumberControlOptions(
  valuePattern?: TReadOnlyProperty<string>,
  decimalPlaces = 2,
): NumberControlOptions {
  const base = panelNumberControlOptions(valuePattern, decimalPlaces);
  return {
    ...base,
    titleNodeOptions: {
      ...base.titleNodeOptions,
      maxWidth: 160,
    },
    numberDisplayOptions: {
      ...base.numberDisplayOptions,
      minBackgroundWidth: CHIRP_NUMBER_DISPLAY_MIN_WIDTH,
    },
    sliderOptions: {
      ...base.sliderOptions,
      trackSize: CHIRP_SLIDER_TRACK,
      thumbSize: SLIDER_THUMB,
    },
  };
}

/**
 * Copy NumberDisplay options without valuePattern / decimalPlaces / numberFormatOptions, which
 * NumberDisplay rejects alongside a numberFormatter.
 */
export function withoutFormatOptions(
  options: NumberControlOptions["numberDisplayOptions"],
): NumberControlOptions["numberDisplayOptions"] {
  if (!options) {
    return options;
  }
  const {
    valuePattern: _valuePattern,
    decimalPlaces: _decimalPlaces,
    numberFormatOptions: _numberFormatOptions,
    ...rest
  } = options;
  return rest;
}

/**
 * NumberControl whose slider moves in log₁₀ space while the model Property stays linear.
 * Returns the control and a dispose callback for the bridge Property.
 */
export function createLogNumberControl(
  title: TReadOnlyProperty<string>,
  property: NumberProperty,
  range: Range,
  valuePattern: TReadOnlyProperty<string>,
  options?: {
    readonly decimalPlaces?: number;
    readonly accessibleName?: TReadOnlyProperty<string>;
    readonly compact?: boolean;
  },
): { readonly control: NumberControl; readonly dispose: () => void } {
  const decimals = options?.decimalPlaces ?? 2;
  const logRange = new Range(Math.log10(range.min), Math.log10(range.max));
  const logProperty = new NumberProperty(Math.log10(property.value), { range: logRange });
  let syncing = false;
  const onModel = (value: number) => {
    if (!syncing) {
      syncing = true;
      logProperty.value = Math.log10(value);
      syncing = false;
    }
  };
  const onLog = (logValue: number) => {
    if (!syncing) {
      syncing = true;
      property.value = 10 ** logValue;
      syncing = false;
    }
  };
  property.lazyLink(onModel);
  logProperty.lazyLink(onLog);

  const base = options?.compact
    ? chirpNumberControlOptions(valuePattern, decimals)
    : panelNumberControlOptions(valuePattern, decimals);
  const controlOptions: NumberControlOptions = {
    ...base,
    delta: logRange.getLength() / 100,
    numberDisplayOptions: {
      ...withoutFormatOptions(base.numberDisplayOptions),
      // numberFormatter is mutually exclusive with valuePattern / decimalPlaces, so apply the pattern here.
      numberFormatter: (logValue: number) => valuePattern.value.replace("{{value}}", toFixed(10 ** logValue, decimals)),
      numberFormatterDependencies: [valuePattern],
    },
  };
  if (options?.accessibleName) {
    controlOptions.accessibleName = options.accessibleName;
  }
  const control = new NumberControl(title, logProperty, logRange, controlOptions);
  return {
    control,
    dispose: () => {
      property.unlink(onModel);
      logProperty.unlink(onLog);
      logProperty.dispose();
    },
  };
}
