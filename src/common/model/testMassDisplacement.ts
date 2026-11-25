/**
 * testMassDisplacement.ts
 *
 * First-order transverse displacement of a free test mass in a gravitational wave
 * propagating along +z (see doc/model.md, Screen 1).
 */

/**
 * Displaces a test mass at rest position `(x, y)` by the + and × strains.
 *
 * δx = ½(h₊ x + h× y),  δy = ½(h× x − h₊ y).
 */
export function displace(
  x: number,
  y: number,
  hPlus: number,
  hCross: number,
): { readonly dx: number; readonly dy: number } {
  return {
    dx: 0.5 * (hPlus * x + hCross * y),
    dy: 0.5 * (hCross * x - hPlus * y),
  };
}
