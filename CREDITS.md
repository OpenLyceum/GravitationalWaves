# Credits — Gravitational Waves

Watch a gravitational wave stretch space, measure it with a laser interferometer, dig a black-hole chirp out of detector noise, and locate the source on the sky with a detector network.

## Data

- **Strain data and event parameters** for GW150914, GW170814, GW170817, GW190521 and GW200129_065458:
  [Gravitational Wave Open Science Center (GWOSC)](https://gwosc.org), released under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This research has made use of data or software obtained
  from GWOSC, a service of the LIGO Scientific Collaboration, the Virgo Collaboration, and KAGRA. The sim bundles
  whitened, band-passed 1.5 s excerpts of the H1 and L1 32 s / 4 kHz files (see `doc/model.md` for the processing) and
  an amplitude spectral density estimated from the H1 data around GW150914.
- Event parameters (source-frame masses, luminosity distance, redshift, network SNR) are from the GWTC-1, GWTC-2.1 and
  GWTC-3 catalog releases as served by the GWOSC event API.
- **Network screen presets**: per-detector SNRs and sky positions from the GW170814 and GW170817 discovery papers
  (Phys. Rev. Lett. 119, 141101 and 161101); detector sites and arm orientations from LALSuite (`LALDetectors.h`).
- **Coastlines**: [Natural Earth](https://www.naturalearthdata.com) 1:110m coastline, public domain.

## License

GNU Affero General Public License v3.0 or later — see [org LICENSE](https://github.com/OpenLyceum/.github/blob/main/LICENSE).
Bundled GWOSC data remain under CC BY 4.0.

## Acknowledgments

Built with [SceneryStack](https://scenerystack.org/) as part of the
[OpenLyceum](https://github.com/OpenLyceum) fleet.
