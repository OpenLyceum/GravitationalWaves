# Model — Gravitational Waves

Educator-facing description of what this simulation models. Audience: introductory
university physics. All quantities are SI unless a unit is stated.

## Overview

A gravitational wave is a ripple in spacetime that stretches distances along one
direction and squeezes them along the perpendicular direction, transverse to the
direction of travel. The sim follows a detection from end to end:

1. **Waves** — what the wave does to a ring of free-falling test masses; the strain
   \(h = \Delta L / L\) and the two polarizations (+ and ×).
2. **Interferometer** — how a Michelson interferometer turns a differential change in
   arm length into a change in light power, and which noise sources limit it.
3. **Chirp** — what an inspiralling binary emits, how the masses and distance set the
   chirp, and how matched filtering finds a signal hidden in noise. Five real
   detections from GWOSC can be compared with the model.

Learning goals. Students will be able to:

1. Describe a gravitational wave as a transverse stretch/squeeze of space and define strain \(h = \Delta L/L\).
2. Explain how an interferometer converts a tiny *differential* arm-length change into a measurable light signal, and why detectors are kilometres long.
3. Identify the main noise sources and the frequency band where ground detectors are most sensitive.
4. Relate a binary's masses and distance to the chirp (frequency sweep, time in band, amplitude).
5. Explain how matched filtering recovers a signal buried in noise, and interpret the signal-to-noise ratio (SNR).

## Constants

| Name | Value |
|---|---|
| \(G\) | \(6.674\,30\times10^{-11}\ \mathrm{m^3\,kg^{-1}\,s^{-2}}\) |
| \(c\) | \(2.997\,924\,58\times10^{8}\ \mathrm{m/s}\) |
| \(M_\odot\) | \(1.988\,41\times10^{30}\ \mathrm{kg}\) |
| \(T_\odot = GM_\odot/c^3\) | \(4.925\,49\times10^{-6}\ \mathrm{s}\) |
| 1 Mpc | \(3.085\,678\times10^{22}\ \mathrm{m}\) |
| Laser wavelength \(\lambda\) | 1064 nm |

## Screen 1 — Waves

The wave travels along \(+z\) (out of the screen). A free test mass at rest position
\((x, y)\) in the transverse plane is displaced, to first order in \(h\), by

\[
\begin{aligned}
\delta x &= \tfrac12\left(h_+\,x + h_\times\,y\right),\\
\delta y &= \tfrac12\left(h_\times\,x - h_+\,y\right),
\end{aligned}
\qquad
h_+(t) = h_0\cos(2\pi f t),\quad h_\times(t) = h_0\cos(2\pi f t)
\]

with only one polarization active at a time (the other is zero). The + pattern stretches
along \(x\) while squeezing along \(y\); the × pattern is the same rotated by 45°.

Two masses a distance \(L\) apart along \(x\) change their separation by
\(\delta L_x = \tfrac12 h_+ L\), while a pair along \(y\) changes by
\(\delta L_y = -\tfrac12 h_+ L\). The *difference* between the two directions is
\(\Delta L = \delta L_x - \delta L_y = h L\): this is the quantity an interferometer
measures, and the readout the Waves screen reports.

**Display exaggeration.** Real strains are \(\sim10^{-21}\). The ring is drawn with a
visual strain \(h_\text{vis}\) (0–0.3) chosen by the student; a readout shows the real
\(h\) and the corresponding real \(\Delta L = hL\) for a chosen baseline
(1 m, 4 km, Earth–Sun distance) next to familiar sizes (atom \(10^{-10}\) m, proton
\(1.7\times10^{-15}\) m).

| Quantity | Symbol | Units | Range |
|---|---|---|---|
| Visual strain | \(h_\text{vis}\) | — | 0 – 0.3 |
| Real strain (readout) | \(h\) | — | \(10^{-23}\) – \(10^{-18}\) (log slider) |
| Frequency (animation) | \(f\) | Hz (sim time) | 0.2 – 2 |
| Baseline | \(L\) | m | 1, 4000, \(1.496\times10^{11}\) |

## Screen 2 — Interferometer

### Antenna response

The detector arms lie along \(x\) and \(y\). For a wave arriving from polar angle
\(\theta\) (from the zenith) and azimuth \(\phi\), with polarization angle \(\psi\):

\[
\begin{aligned}
F_+ &= \tfrac12(1+\cos^2\theta)\cos2\phi\cos2\psi - \cos\theta\sin2\phi\sin2\psi,\\
F_\times &= \tfrac12(1+\cos^2\theta)\cos2\phi\sin2\psi + \cos\theta\sin2\phi\cos2\psi,
\end{aligned}
\qquad h_\text{det} = F_+h_+ + F_\times h_\times .
\]

The sim exposes \(\theta\) and \(\psi\) (with \(\phi = 0\)) plus a "blind spot" preset
(\(\theta = 90^\circ,\ \phi = 45^\circ\) gives \(F_+ = F_\times = 0\)). Overhead + wave
(\(\theta = \psi = 0\)) gives \(F_+ = 1\).

### Arm lengths and output power

\[
L_x = L\left(1 + \tfrac12 h_\text{det}\right),\qquad
L_y = L\left(1 - \tfrac12 h_\text{det}\right),\qquad
\Delta L = L_x - L_y = h_\text{det}\,L .
\]

Fabry–Pérot arm cavities make the light bounce many times; the sim uses an effective
gain \(N = 300\) (off: \(N = 1\)). The round-trip phase difference between the arms and
the power at the photodetector are

\[
\Delta\varphi = \frac{4\pi N\,\Delta L}{\lambda},\qquad
P_\text{out} = P_\text{in}\,\sin^2\!\left(\frac{\Delta\varphi + \varphi_0}{2}\right),
\]

with a small fixed offset \(\varphi_0\) (DC readout) so the output responds linearly.
For display, \(\Delta L\) is multiplied by a visual exaggeration factor so the fringe
moves visibly; the readouts always report the real values.

### Noise and sensitivity

Strain noise is shown as an amplitude spectral density (ASD) in \(\mathrm{Hz^{-1/2}}\)
on log–log axes from 10 Hz to 5 kHz. Three toy terms, added in quadrature, reproduce
the familiar "bucket" of a ground detector:

\[
\begin{aligned}
h_\text{seis}(f) &= 1.0\times10^{-22}\,\frac{L_0}{L}\left(\frac{10\ \text{Hz}}{f}\right)^{4},\\
h_\text{therm}(f) &= 3.0\times10^{-24}\,\frac{L_0}{L}\left(\frac{100\ \text{Hz}}{f}\right)^{1/2},\\
h_\text{shot}(f) &= 2.5\times10^{-24}\,\frac{L_0 N_0}{L N}\sqrt{\frac{P_0}{P_\text{in}}}\sqrt{1+\left(\frac{f}{150\ \text{Hz}}\right)^2},\\
h_n(f) &= \sqrt{h_\text{seis}^2 + h_\text{therm}^2 + h_\text{shot}^2},
\end{aligned}
\]

with reference values \(L_0 = 4\) km, \(N_0 = 300\), \(P_0\) = the default laser power
(normalized to 1). Seismic and thermal noise are *displacement* noise, so their strain
falls as \(1/L\) but is not helped by Fabry–Pérot cavities or laser power. Shot noise is
photon-counting noise, so it falls as \(1/(LN\sqrt{P})\). Each term can be toggled.
The default total has its minimum ≈ \(4\times10^{-24}\) near 150 Hz.

A real curve is overlaid for comparison: the LIGO Hanford ASD measured from the
32 s of GWOSC data around GW150914 (see Data provenance).

| Quantity | Symbol | Units | Range |
|---|---|---|---|
| Arm length | \(L\) | km | 0.1 – 10 (default 4) |
| Fabry–Pérot gain | \(N\) | — | 1 or 300 |
| Laser power | \(P_\text{in}/P_0\) | — | 0.1 – 10 (log) |
| Source angle | \(\theta\) | ° | 0 – 90 |
| Polarization angle | \(\psi\) | ° | 0 – 90 |

## Screen 3 — Chirp

### Inspiral

Masses \(m_1, m_2\) are detector-frame masses in \(M_\odot\). Define total mass
\(M = m_1 + m_2\) and chirp mass

\[
\mathcal{M} = \frac{(m_1 m_2)^{3/5}}{M^{1/5}},\qquad
T_\mathcal{M} = \frac{G\mathcal{M}}{c^3} = T_\odot\,\frac{\mathcal{M}}{M_\odot}.
\]

At leading (quadrupole, Newtonian) order, with \(\tau = t_c - t\) the time remaining
before coalescence, the gravitational-wave frequency, phase and amplitude are

\[
\begin{aligned}
f(\tau) &= \frac{1}{\pi}\left(\frac{5}{256\,\tau}\right)^{3/8} T_\mathcal{M}^{-5/8},\\
\Phi(\tau) &= \Phi_c - 2\left(\frac{\tau}{5\,T_\mathcal{M}}\right)^{5/8},\\
A(\tau) &= \frac{4c}{D}\,T_\mathcal{M}^{5/3}\,\bigl(\pi f(\tau)\bigr)^{2/3},\\
h(t) &= A(\tau)\cos\Phi(\tau),
\end{aligned}
\]

for an optimally oriented source at luminosity distance \(D\). The time the signal spends
above a frequency \(f\) (time in band, quoted for \(f = 20\) Hz) is

\[
\tau(f) = \frac{5}{256}\,T_\mathcal{M}^{-5/3}\,(\pi f)^{-8/3}.
\]

### Merger and ringdown (phenomenological)

The inspiral is cut at the innermost stable circular orbit,
\(f_\text{ISCO} = 1/(6^{3/2}\pi\,T_M)\) with \(T_M = GM/c^3\). After that the remnant
rings down as a damped sinusoid at

\[
f_\text{ring} = \frac{0.0844}{T_{M_f}},\qquad \tau_\text{ring} = \frac{Q}{\pi f_\text{ring}},\quad Q = 3.2,
\]

with final mass \(M_f = 0.95\,M\). Phase and amplitude are joined continuously at the
cut, and the frequency is ramped linearly from \(f_\text{ISCO}\) to \(f_\text{ring}\)
over one ringdown cycle. This is a cartoon of merger, labelled as such in the sim; the
real merger needs numerical relativity.

For binary neutron stars (\(M < 5\,M_\odot\)) the ringdown is omitted: the signal ends
at \(f_\text{ISCO}\) (the stars merge before a black hole forms; the sim does not model
the remnant).

### Whitened detector output

Detector data are shown *whitened*: each frequency is divided by the noise ASD, so the
noise becomes white with unit variance per sample. At sample rate \(f_s\) (2048 Hz in
the sim) the whitened signal is approximately

\[
w(t) = h(t)\,\frac{\sqrt{2/f_s}}{h_n\!\bigl(f(t)\bigr)}
\]

(slowly varying frequency), and the displayed data are \(d_i = w(t_i) + n_i\) with
\(n_i \sim \mathcal N(0,1)\) from a seeded generator. With this normalization
\(\sum_i w_i^2 \approx \rho_\text{opt}^2\).

### Optimal SNR

Using the stationary-phase Fourier amplitude of the inspiral,

\[
|\tilde h(f)| = \sqrt{\tfrac{5}{24}}\;\pi^{-2/3}\,\frac{c}{D}\,T_\mathcal{M}^{5/6}\,f^{-7/6},
\qquad
\rho_\text{opt}^2 = 4\int_{f_\text{low}}^{f_\text{ISCO}} \frac{|\tilde h(f)|^2}{h_n(f)^2}\,df,
\]

with \(f_\text{low} = 20\) Hz, evaluated numerically on a log grid. A detection needs
\(\rho \gtrsim 8\).

### Matched filtering

The student chooses template masses \((m_1', m_2')\). The match between template and
signal uses the stationary-phase phase

\[
\Psi(f;\mathcal M) = \tfrac{3}{128}\left(\pi T_\mathcal{M} f\right)^{-5/3},
\]

\[
\text{match}(\mathcal M,\mathcal M') =
\max_{\Delta t}\;
\frac{\left|\displaystyle\int \frac{f^{-7/3}}{h_n^2}\,
e^{\,i[\Psi(f;\mathcal M) - \Psi(f;\mathcal M') + 2\pi f\Delta t]}\,df\right|}
{\displaystyle\int \frac{f^{-7/3}}{h_n^2}\,df},
\]

taken over \(\Delta t\in[-0.2, 0.2]\) s in 0.5 ms steps (the absolute value maximizes over
phase). The upper limit is the smaller of the two ISCO frequencies. The *recovered SNR*
is \(\rho = \rho_\text{opt}\times\text{match}\). A best-fit button scans a grid of
template chirp masses and shows the SNR-vs-\(\mathcal M'\) curve: the peak lands on the
true chirp mass. At leading order only \(\mathcal M\) is measurable from the phase;
individual masses are not, which the sim states.

### Audio

The chirp is played back as sound. Signal frequencies are already audible (tens to
hundreds of Hz); playback is at real speed with frequencies multiplied by 2 (one octave
up) so small speakers can reproduce them. Real-event playback uses the whitened,
band-passed strain.

| Quantity | Symbol | Units | Range |
|---|---|---|---|
| Mass 1 | \(m_1\) | \(M_\odot\) | 1 – 100 |
| Mass 2 | \(m_2\) | \(M_\odot\) | 1 – 100 (\(\le m_1\)) |
| Distance | \(D\) | Mpc | 10 – 5000 (log) |
| Template masses | \(m_1', m_2'\) | \(M_\odot\) | same as above |

## Real-event presets (data provenance)

Strain data from the Gravitational Wave Open Science Center (GWOSC,
https://gwosc.org), released under CC BY 4.0 by the LIGO Scientific Collaboration,
the Virgo Collaboration and the KAGRA Collaboration. `npm run build-data` downloads the
32 s, 4 kHz plain-text strain for H1 and L1 around each event, then:

1. Estimates the ASD with Welch's method (4 s Hann segments, 50 % overlap).
2. Whitens the 32 s in the frequency domain (Tukey window, \(\alpha = 0.1\)).
3. Band-passes 30–350 Hz (35–350 Hz for GW170817 so its long inspiral is visible as
   a smear rather than drowned in low-frequency residue).
4. Keeps 1.5 s ending 0.1 s after the merger time (the GPS time in the catalog),
   resampled to 2048 Hz, as 16-bit integers with a scale factor.

| Event | \(m_1, m_2\) (source, \(M_\odot\)) | \(D\) (Mpc) | \(z\) | Network SNR | Catalog |
|---|---|---|---|---|---|
| GW150914 | 34.6, 30.0 | 470 | 0.10 | 26.0 | GWTC-2.1 |
| GW170814 | 30.9, 24.9 | 610 | 0.13 | 17.7 | GWTC-2.1 |
| GW170817 | 1.46, 1.27 | 40 | 0.01 | 33.0 | GWTC-1 |
| GW190521 | 98.4, 57.2 | 3310 | 0.56 | 14.3 | GWTC-2.1 |
| GW200129_065458 | 34.5, 29.0 | 890 | 0.18 | 26.8 | GWTC-3 |

The model overlay uses detector-frame masses \(m(1+z)\) — the redshift stretches the
signal, so GW190521 shows almost only its merger and ringdown. Model and data are each
normalized to their peak for the overlay; the sim compares *shape* (frequency sweep and
duration), not amplitude.

## Simplifications

- Leading-order (Newtonian) inspiral; no spins, no higher harmonics, no eccentricity.
  Phase errors grow near merger.
- Merger and ringdown are a phenomenological join, not numerical relativity.
- Toy three-term noise curve; real detectors have many more terms and spectral lines.
- Optimal orientation for the Chirp screen; the antenna pattern appears only on the
  Interferometer screen.
- Whitened time series use a slowly-varying-frequency approximation.
- One detector at a time; no sky localization (possible future Network screen).
