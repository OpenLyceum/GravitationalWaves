# AGENTS.md — Gravitational Waves

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Gravitational Waves (`gravitational-waves`) is a SceneryStack simulation with three screens:

- **Waves** — test-mass ring under + / × strain.
- **Interferometer** — Michelson response, antenna pattern, toy noise ASD.
- **Chirp** — Newtonian inspiral + phenomenological ringdown, matched filtering, real GWOSC events.

Physics and data provenance: [`doc/model.md`](doc/model.md). Architecture: [`doc/implementation-notes.md`](doc/implementation-notes.md).

## Key files

| File | Purpose |
|---|---|
| `src/GravitationalWavesColors.ts` | All `ProfileColorProperty` instances |
| `src/GravitationalWavesConstants.ts` | Named numeric constants |
| `src/GravitationalWavesNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/common/GravitationalWavesPanel.ts` | Pre-themed `Panel` wrapper |
| `src/common/GravitationalWavesButtonOptions.ts` | Flat button / combo-box option bundles |
| `src/common/TimeModel.ts` | Play/pause, speed, and elapsed time composed by screen models |
| `src/common/model/PhysicalConstants.ts` | G, c, M_☉, T_☉, Mpc, laser λ |
| `src/common/model/testMassDisplacement.ts` | First-order test-mass displacement |
| `src/common/model/AntennaPattern.ts` | F₊, F× antenna factors |
| `src/common/model/Interferometer.ts` | Arm lengths, Fabry–Pérot phase, output power |
| `src/common/model/NoiseModel.ts` | Toy seismic / thermal / shot ASD |
| `src/common/model/Chirp.ts` | Inspiral + merger/ringdown waveform |
| `src/common/model/MatchedFilter.ts` | SPA amplitude, optimal SNR, match, SNR scan |
| `src/common/model/whiten.ts` | Whitened strain approx. and seeded noise |
| `src/common/data/dataTypes.ts` | Catalog / strain TypeScript shapes |
| `src/common/data/eventLibrary.ts` | `catalogEvents`, `loadEvent`, `detectorFrameMasses` |
| `src/common/data/generated/` | **Generated — do not edit.** Owned by `npm run build-data` |
| `src/waves/WavesScreen.ts` | Screen wrapper |
| `src/waves/model/WavesModel.ts` | Simulation state and logic |
| `src/waves/view/WavesScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/interferometer/InterferometerScreen.ts` | Screen wrapper |
| `src/interferometer/model/InterferometerModel.ts` | Simulation state and logic |
| `src/interferometer/view/InterferometerScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/chirp/ChirpScreen.ts` | Screen wrapper |
| `src/chirp/model/ChirpModel.ts` | Simulation state and logic |
| `src/chirp/view/ChirpScreenView.ts` | Visual nodes, layout, a11y wiring |
| `scripts/build-data.ts` | Downloads GWOSC strain and emits generated modules |
| `scripts/data/events.json` | Hand-edited event list (parameters + H1 URLs) |
| `scripts/data/{dsp,buildEvent,fetchCache,emit}.ts` | FFT/Welch/whiten, per-event build, cache, emit |

## Data

- Five GWOSC events are listed in `scripts/data/events.json` (masses, distance, GPS, H1 32 s / 4 kHz txt.gz URL). L1 URL = H1 with `H-H1_` → `L-L1_`. Do not query the catalog API at build time.
- `npm run build-data` needs network once; downloads cache under `.cache/` (git-ignored). Pipeline: Welch ASD → Tukey whiten → band-pass → 1.5 s window ending 0.1 s after GPS → decimate to 2048 Hz → Int16.
- Catalog (`eventCatalog.ts`) and H1 ASD overlay (`ligoAsd.ts`) are bundled; each event’s strain is a lazy Vite chunk under `generated/events/`.
- Overlay masses are detector-frame: `detectorFrameMasses(event)` = m_source · (1+z).

## Gotchas

- `npm run test:fuzz` runs with assertions (`?ea`); screenshots and unit tests do not. Run it after any view change.
  A `NumberControl` with `numberFormatter` must not also get `valuePattern` / `decimalPlaces`
  (use `withoutFormatOptions` in `src/common/view/themedNumberControl.ts`).
- Mass guards in `ChirpModel` write only the *other* mass Property (raising m₂ above m₁ pushes m₁ up) to avoid reentrant sets.
- Position empty-at-construction `Path`/`Line` nodes with `x`/`y`, not `left`/`top` (empty bounds swallow the offset).
- `match()` normalizes signal and template over their own ISCO bands; the overlap runs to the smaller ISCO.
  Keep `tests/matchedFilter.test.ts` "full-range scan peaks at the true chirp mass" passing.
- Model SNRs use `ORIENTATION_FACTOR = 0.4` (rms sky/orientation average); the toy noise is more sensitive than O1,
  so model SNRs for presets run above the catalog values by design.

## Compliance carve-outs

None yet.
