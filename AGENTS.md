# AGENTS.md — Gravitational Waves

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Gravitational Waves (`gravitational-waves`) is a SceneryStack simulation scaffolded from SceneryStackTemplate.

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
| `src/waves/WavesScreen.ts` | Screen wrapper |
| `src/waves/model/WavesModel.ts` | Simulation state and logic |
| `src/waves/view/WavesScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/interferometer/InterferometerScreen.ts` | Screen wrapper |
| `src/interferometer/model/InterferometerModel.ts` | Simulation state and logic |
| `src/interferometer/view/InterferometerScreenView.ts` | Visual nodes, layout, a11y wiring |
| `src/chirp/ChirpScreen.ts` | Screen wrapper |
| `src/chirp/model/ChirpModel.ts` | Simulation state and logic |
| `src/chirp/view/ChirpScreenView.ts` | Visual nodes, layout, a11y wiring |

## Compliance carve-outs

None yet.
