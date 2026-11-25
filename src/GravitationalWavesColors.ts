/**
 * GravitationalWavesColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import GravitationalWavesNamespace from "./GravitationalWavesNamespace.js";

const GravitationalWavesColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  /** Secondary / muted labels (captions, notes). */
  mutedTextColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "mutedText", {
    default: "#9e9e9e",
    projector: "#555555",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Waves screen ─────────────────────────────────────────────────────────────

  /** Free-falling test masses on the ring. */
  testMassColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "testMass", {
    default: "#81d4fa",
    projector: "#0277bd",
  }),

  /** Central reference mass. */
  centreMassColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "centreMass", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  /** Rest-position ring (faint). */
  restRingColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "restRing", {
    default: "rgba(224,224,224,0.25)",
    projector: "rgba(26,26,26,0.2)",
  }),

  /** Deformable spacetime grid. */
  deformGridColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "deformGrid", {
    default: "rgba(79,195,247,0.35)",
    projector: "rgba(2,119,189,0.35)",
  }),

  /** Arm length lines from centre to ring. */
  armLineColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "armLine", {
    default: "#ce93d8",
    projector: "#7b1fa2",
  }),

  /** Strain strip-chart trace. */
  strainTraceColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "strainTrace", {
    default: "#4fc3f7",
    projector: "#0277bd",
  }),

  /** Mini-chart / strip background. */
  chartBackgroundColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chartBackground", {
    default: "#0d1b2a",
    projector: "#fafafa",
  }),

  /** Chart border. */
  chartBorderColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chartBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /** Chart grid lines. */
  chartGridColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chartGrid", {
    default: "rgba(224,224,224,0.12)",
    projector: "rgba(26,26,26,0.12)",
  }),

  // ── Interferometer screen ────────────────────────────────────────────────────

  /** Laser / beam colour. */
  laserBeamColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "laserBeam", {
    default: "#ef5350",
    projector: "#c62828",
  }),

  /** Michelson apparatus chrome (mirrors, splitter housing). */
  apparatusColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "apparatus", {
    default: "#b0bec5",
    projector: "#455a64",
  }),

  /** Laser box fill. */
  laserBoxColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "laserBox", {
    default: "#37474f",
    projector: "#cfd8dc",
  }),

  /** Photodetector body. */
  photodetectorColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "photodetector", {
    default: "#78909c",
    projector: "#546e7a",
  }),

  /** Output-power strip trace. */
  powerTraceColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "powerTrace", {
    default: "#ff8a65",
    projector: "#e64a19",
  }),

  /** Seismic noise ASD curve. */
  seismicNoiseColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "seismicNoise", {
    default: "#81c784",
    projector: "#2e7d32",
  }),

  /** Thermal noise ASD curve. */
  thermalNoiseColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "thermalNoise", {
    default: "#ffb74d",
    projector: "#ef6c00",
  }),

  /** Shot noise ASD curve. */
  shotNoiseColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "shotNoise", {
    default: "#64b5f6",
    projector: "#1565c0",
  }),

  /** Total toy ASD curve. */
  totalNoiseColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "totalNoise", {
    default: "#eeeeee",
    projector: "#212121",
  }),

  /** Real LIGO H1 overlay. */
  ligoAsdColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "ligoAsd", {
    default: "#f48fb1",
    projector: "#ad1457",
  }),

  /** Most-sensitive-band highlight. */
  sensitiveBandColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "sensitiveBand", {
    default: "rgba(79,195,247,0.18)",
    projector: "rgba(2,119,189,0.18)",
  }),
};

export default GravitationalWavesColors;
