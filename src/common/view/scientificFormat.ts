/**
 * Helpers for scientific-notation readouts (coeff × 10^exp) as RichText markup.
 *
 * Exponents use a real minus sign (U+2212) inside <sup> so NumberDisplay /
 * RichText render proper superscripts rather than raw "10^{-18}" or "1.4e-8".
 */
import { toFixed } from "scenerystack/dot";

/** Unicode minus for exponents (not ASCII hyphen-minus). */
const MINUS = "\u2212";

/** Split a number into signed coefficient ∈ (±1, ±10] and integer exponent. */
function scientificParts(value: number): { readonly coeff: number; readonly exp: number } {
  if (!Number.isFinite(value) || value === 0) {
    return { coeff: 0, exp: 0 };
  }
  const sign = value < 0 ? -1 : 1;
  const mag = Math.abs(value);
  const exp = Math.floor(Math.log10(mag));
  const coeff = sign * (mag / 10 ** exp);
  return { coeff, exp };
}

/** Format an integer exponent with a real minus when negative. */
function formatExponent(exp: number): string {
  return exp < 0 ? `${MINUS}${Math.abs(exp)}` : String(exp);
}

/**
 * RichText markup: "a.bc × 10<sup>−e</sup>" (signed coefficient, real minus).
 * Use with `RichText` or `NumberDisplay({ useRichText: true })`.
 */
export function formatScientific(value: number, digits = 2): string {
  const { coeff, exp } = scientificParts(value);
  return `${toFixed(coeff, digits)} × 10<sup>${formatExponent(exp)}</sup>`;
}

/**
 * Round a positive ratio to 2 significant figures and group thousands
 * (e.g. 430 → "430", 4300 → "4,300") for comparison phrases.
 */
export function formatComparisonFactor(ratio: number): string {
  if (!(ratio > 0 && Number.isFinite(ratio))) {
    return "0";
  }
  const rounded = Number(ratio.toPrecision(2));
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 12 });
}
