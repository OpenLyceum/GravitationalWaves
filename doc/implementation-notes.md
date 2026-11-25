# Implementation notes — Gravitational Waves

Developer-facing architecture notes for `gravitational-waves`.

## Architecture

Screens: src/waves/, src/interferometer/, src/chirp/

- Models own state and `step` / `reset`; views observe Properties and never integrate physics.
- Colors live in `src/GravitationalWavesColors.ts`; strings in `src/i18n/` via `StringManager`.
- Preferences shell: `src/preferences/` (empty until sim-specific prefs are added).

## Notes

*Record design decisions, performance constraints, and known limitations here.*
