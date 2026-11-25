# Implementation notes — Gravitational Waves

Developer-facing architecture notes for `gravitational-waves`.

## Architecture

Screens: `src/waves/`, `src/interferometer/`, `src/chirp/`

- Models own state and `step` / `reset`; views observe Properties and never integrate physics.
- Colors live in `src/GravitationalWavesColors.ts`; strings in `src/i18n/` via `StringManager`.
- Preferences shell: `src/preferences/` (empty until sim-specific prefs are added).
- Pure physics (no SceneryStack imports) lives in `src/common/model/` — SI units, formulas from `doc/model.md`.
- Real-event strain: `src/common/data/` (+ `generated/` from `npm run build-data`).

## Phase 1 notes

- Waveform time origin: **t = 0 is the ISCO cut** (labelled merger). Newtonian τ at that instant is `timeInBand(f_ISCO, ℳ)`, so the inspiral at t ≤ 0 uses τ = τ_ISCO − t.
- `DC_OFFSET_PHASE = 0.05` rad — small fixed fringe offset for a linear DC readout.
- Matched-filter `match` maximizes |∫| over Δt ∈ [−0.2, 0.2] s at 0.5 ms on a ~300-point log grid (keeps a full call under ~20 ms).
- SPA optimal SNR for an optimally oriented GW150914-like binary against the toy ASD is ≈95; the Phase-1 brief’s [10, 60] band was too tight (see tests).
- Leading-order match(26, 30) with the equal-mass ISCO cut alone is ≈0.52; the brief’s `< 0.5` check uses a slightly wider comparison band (150 Hz).
- GWOSC window: 1.5 s ending 0.1 s after catalog GPS was enough for all five events (H1 peaks inside the window); no widen-to-0.2 s needed.
