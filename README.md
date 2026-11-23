# Body Fluids at the Bedside

Interactive case activity for teaching ECF volume, serum osmolality and water shifts, on a fluid compartment (Darrow–Yannet) diagram.

**Live page:** https://imurra.github.io/Darrow_Yannet_Diagram/ (opens the activity)

## The activity — `bedside/`
Opening screen with the purpose, then six steps per case (diagnosis given):
1. What is affected (circulation, brain, both, neither) from vital signs and mental status
2. ECF volume (exam)
3. Serum osmolality (2 × Na⁺ + glucose/18 + BUN/2.8)
4. Cells (higher side, water movement, brain)
5. Kidney (water, salt, appropriate or contributing)
6. Causal chain and case summary

4 cases: diarrhea, SIADH, heart failure, HHS.
`bedside/index.html` is self-contained and works offline.

## Hosting
GitHub Pages (Settings → Pages → Deploy from branch `main`, `/ (root)`).
The site root redirects to `bedside/`. `_config.yml` keeps `archive/` off the published site.

## Model
- Baseline 42 L total body water: ICF 28 L, ECF 14 L, 290 mOsm/kg
- Effective osmoles (Na⁺ salts, glucose) stay in the ECF; ICF solute is fixed; urea crosses membranes freely
- Directions of change have been checked for every case and treatment

## Archive (not published)
- `archive/explorer/` — the corrected fluid-type Explorer (gain or lose isotonic, hypotonic or hypertonic fluid; before/after water shift; three-question walkthrough)
- `archive/Darrow Yannet fluid-balance-dashboard- cc commons.tsx` — the original 2024 dashboard; see `archive/README.md`

## License
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
- Attribution required to Ian Murray
- Non-commercial use only
- Educational use permitted
- Share-alike requirement for derivative works

## Contact
Author: Ian Victor Joseph Murray
Email: imurra@yahoo.com
