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

  // ── Chirp screen ─────────────────────────────────────────────────────────────

  /** Model / signal strain and whitened-signal traces. */
  chirpSignalColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpSignal", {
    default: "#4fc3f7",
    projector: "#0277bd",
  }),

  /** Whitened detector noise (grey). */
  chirpNoiseColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpNoise", {
    default: "#90a4ae",
    projector: "#607d8b",
  }),

  /** Matched-filter template overlay. */
  chirpTemplateColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpTemplate", {
    default: "#ffd54f",
    projector: "#f9a825",
  }),

  /** Real-event H1 whitened data. */
  chirpH1ColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpH1", {
    default: "#ef9a9a",
    projector: "#c62828",
  }),

  /** Real-event L1 whitened data. */
  chirpL1ColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpL1", {
    default: "#ce93d8",
    projector: "#7b1fa2",
  }),

  /** Playhead cursor across Chirp plots. */
  chirpPlayheadColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpPlayhead", {
    default: "#ffffff",
    projector: "#212121",
  }),

  /** Frequency track on the spectrogram. */
  chirpFrequencyTrackColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpFrequencyTrack", {
    default: "#ffffff",
    projector: "#000000",
  }),

  /** SNR-scan curve. */
  chirpSnrScanColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpSnrScan", {
    default: "#81c784",
    projector: "#2e7d32",
  }),

  /** True-chirp-mass marker on the SNR scan. */
  chirpTrueMcColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpTrueMc", {
    default: "#ff8a65",
    projector: "#e64a19",
  }),

  /** “Detected!” badge fill. */
  chirpDetectedColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpDetected", {
    default: "#66bb6a",
    projector: "#2e7d32",
  }),

  /** “Below threshold” badge fill. */
  chirpBelowThresholdColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpBelowThreshold", {
    default: "#ef5350",
    projector: "#c62828",
  }),

  /** Text on detection badges (on saturated fills). */
  chirpBadgeTextColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "chirpBadgeText", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Spectrogram colour-map low (quiet). */
  spectrogramLowColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "spectrogramLow", {
    default: "#0d1b2a",
    projector: "#fafafa",
  }),

  /** Spectrogram colour-map mid. */
  spectrogramMidColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "spectrogramMid", {
    default: "#1565c0",
    projector: "#42a5f5",
  }),

  /** Spectrogram colour-map high (loud). */
  spectrogramHighColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "spectrogramHigh", {
    default: "#ffeb3b",
    projector: "#f57f17",
  }),

  // ── Network screen (Okabe–Ito detector colours) ──────────────────────────────

  /** LIGO Hanford (H1) — orange. */
  networkH1ColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkH1", {
    default: "#E69F00",
    projector: "#B37400",
  }),

  /** LIGO Livingston (L1) — sky blue. */
  networkL1ColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkL1", {
    default: "#56B4E9",
    projector: "#0072B2",
  }),

  /** Virgo (V1) — bluish green. */
  networkV1ColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkV1", {
    default: "#009E73",
    projector: "#006B4F",
  }),

  /** KAGRA (K1) — vermillion. */
  networkK1ColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkK1", {
    default: "#D55E00",
    projector: "#A04600",
  }),

  /** Disabled / hollow detector marker. */
  networkDetectorOffColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkDetectorOff", {
    default: "#78909c",
    projector: "#90a4ae",
  }),

  /** Ocean fill under the sky map. */
  networkOceanColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkOcean", {
    default: "#0d2137",
    projector: "#bbdefb",
  }),

  /** Coastline strokes. */
  networkCoastColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkCoast", {
    default: "#5c7a8a",
    projector: "#546e7a",
  }),

  /** Lat/lon grid on the sky map. */
  networkGridColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkGrid", {
    default: "rgba(144,164,174,0.35)",
    projector: "rgba(84,110,122,0.35)",
  }),

  /** Posterior heat-map warm colour (alpha varies with density). */
  networkHeatColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkHeat", {
    default: "#ff8a65",
    projector: "#e64a19",
  }),

  /** Stronger fill for the 90 % credible region. */
  networkHeat90ColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkHeat90", {
    default: "#ffcc80",
    projector: "#ef6c00",
  }),

  /** Equal-delay ring stroke. */
  networkRingColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkRing", {
    default: "#ce93d8",
    projector: "#8e24aa",
  }),

  /** True-source star. */
  networkTruthColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkTruth", {
    default: "#ffeb3b",
    projector: "#f9a825",
  }),

  /** Most-probable-direction “+” marker. */
  networkPeakColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkPeak", {
    default: "#ffffff",
    projector: "#212121",
  }),

  /** Arrival-trace playhead. */
  networkPlayheadColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkPlayhead", {
    default: "#ffffff",
    projector: "#212121",
  }),

  /** Detector arrival flash / glow. */
  networkFlashColorProperty: new ProfileColorProperty(GravitationalWavesNamespace, "networkFlash", {
    default: "rgba(255,235,59,0.55)",
    projector: "rgba(249,168,37,0.45)",
  }),
};

export default GravitationalWavesColors;
