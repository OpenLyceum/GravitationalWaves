/**
 * AntennaPattern.ts
 *
 * L-shaped interferometer antenna response for a wave from (θ, φ) with
 * polarization angle ψ (radians). Arms along +x and +y (see doc/model.md).
 */

/**
 * Antenna pattern factors F₊ and F×.
 *
 * F₊ = ½(1+cos²θ) cos2φ cos2ψ − cosθ sin2φ sin2ψ
 * F× = ½(1+cos²θ) cos2φ sin2ψ + cosθ sin2φ cos2ψ
 */
export function antennaPattern(
  theta: number,
  phi: number,
  psi: number,
): { readonly fPlus: number; readonly fCross: number } {
  const cosTheta = Math.cos(theta);
  const halfPlusCos2 = 0.5 * (1 + cosTheta * cosTheta);
  const cos2Phi = Math.cos(2 * phi);
  const sin2Phi = Math.sin(2 * phi);
  const cos2Psi = Math.cos(2 * psi);
  const sin2Psi = Math.sin(2 * psi);
  return {
    fPlus: halfPlusCos2 * cos2Phi * cos2Psi - cosTheta * sin2Phi * sin2Psi,
    fCross: halfPlusCos2 * cos2Phi * sin2Psi + cosTheta * sin2Phi * cos2Psi,
  };
}
