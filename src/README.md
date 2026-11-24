# Body Fluid Physiology: Volume and Osmolality

Interactive case activity on a live fluid compartment (Darrow–Yannet) diagram.

Purpose: the amount of sodium sets ECF volume (circulation); its concentration, with glucose, sets serum osmolality (cells, brain first). Each case gives the diagnosis by name; students work out what it does to the fluid compartments.

An opening screen states the purpose and how to read the diagram. Each case then has six steps:
1. What is affected (circulation, brain, both, neither) from vital signs and mental status.
2. ECF volume (decreased, normal, increased) from the exam. The change lands in the ECF first; the diagram changes ECF width only.
3. Serum osmolality (low, normal, high), calculated as 2 × Na⁺ + glucose/18 + BUN/2.8. After Check, the ECF takes its new height while the cells stay at 290.
4. Cells: which side has the higher osmolality, and which way water moves; then what that means for the brain.
5. Kidney: retaining or excreting water, retaining or excreting salt, and whether the response is appropriate or contributing to the problem. Each answer gets its own labeled feedback.
6. Case summary (unscored). The causal-chain ordering task was removed in Nov 2026; the chains stay in `cases.ts` as data.

Steps 2–4 are answered by tapping outlines on the diagram (ECF width, ECF height, water arrow); there are no duplicate buttons. Each step highlights the chart rows and the part of the diagram it uses, and a one-line key under the diagram explains width and height. Scored out of 8 per case. The Reference page lists each source with a note on what it supports. Each step has a Reset button; only the first answer is scored. There is no treatment step.

4 cases: acute infectious diarrhea; SIADH from small cell lung carcinoma; acute decompensated HFrEF; HHS. Each gives the full diagnosis name; the mechanism is held for the feedback and case summary.
`index.html` is self-contained and works offline.

## Source
- `src/engine.ts` — mass-balance model (salt, glucose, urea; ICF solute fixed)
- `src/cases.ts` — cases, expected answers, causal chains (not shown) and summaries (treatment grades kept as data but not shown)
- `src/BedsideFlow.tsx` — React interface
- `src/styles.css` — styles (light and dark)

Teaching model: 42 L body water; osmolality shown in mOsm/kg (1 L ≈ 1 kg). Urine cutoffs follow Spasovski et al. 2014; HHS values meet the 2024 consensus criteria. The diagram shows only patient values: ECF volume as examined, serum osmolality as measured; cells start at normal and then match the serum.

© 2026 Ian V. J. Murray · CC BY-NC-SA 4.0
