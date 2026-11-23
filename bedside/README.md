# Body Fluids at the Bedside: Volume and Osmolality

Interactive case activity on a live fluid compartment (Darrow–Yannet) diagram.

Purpose: the amount of sodium sets ECF volume (circulation); its concentration, with glucose, sets serum osmolality (cells, brain first). Each case gives the diagnosis; students work out what it does to the fluid compartments.

An opening screen states the purpose and how to read the diagram. Each case then has five steps:
1. ECF volume (decreased, normal, increased) from vital signs and exam. The change lands in the ECF first; the diagram changes ECF width only.
2. Serum osmolality (low, normal, high), calculated as 2 × Na⁺ + glucose/18 + BUN/2.8. After Check, the ECF takes its new height while the cells stay at 290.
3. Cells: which side has the higher osmolality, and which way water moves; then what that means for the brain.
4. Kidney: retaining or excreting water, retaining or excreting salt, and whether the response is appropriate or contributing to the problem. Each answer gets its own labeled feedback.
5. Causal chain (links that happen at the same time share a number; either order is accepted), then a case summary.

Scored out of 8 per case. Each step has a Reset button; only the first answer is scored. There is no treatment step.

4 core cases: diarrhea, SIADH (small cell lung carcinoma), heart failure (HFrEF), HHS.
Extra practice (optional, not yet clinician-reviewed; reached from the "Extra practice" button or the end of case 4): marathon runner, Addison's, elderly dehydration, lithium DI.

`card.html` is a printable one-page summary of the six volume–osmolality states, linked from the Reference page.
`index.html` is self-contained and works offline.

## Source
- `src/engine.ts` — mass-balance model (salt, glucose, urea; ICF solute fixed)
- `src/cases.ts` — cases, expected answers, causal chains and summaries (treatment grades kept as data but not shown)
- `src/BedsideFlow.tsx` — React interface
- `src/styles.css` — styles (light and dark)

Teaching model: 42 L body water; osmolality shown in mOsm/kg (1 L ≈ 1 kg); urine values are illustrative.

© 2026 Ian V. J. Murray · CC BY-NC-SA 4.0
