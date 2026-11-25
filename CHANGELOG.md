# Change log

One row per discrete change, so changes can be counted by category and source. A row tagged `[n texts]` applies one change to n places (e.g., the same rewrite across cases).
Add a row with every commit that changes the app (`src/` or `index.html`).

**Categories** (same as the abstract): `diagram-interaction`, `framing-scope`, `error-correction`, `simplification`.
**Sources:** `development` (author + AI while building), `faculty-review` (the 9-faculty survey round), `accuracy-review` (structured AI review), `author` (author's own revision), `user-testing` (feedback from someone using the app, relayed by the author).

**Baseline:** the abstract's 81 changes (development 40; review round 41) were counted separately, before this log existed. Record the commit that count ended at: `________`. Rows below start after it.

Count with: `python3 tools/count_changes.py`

| Date | Commit | Change | Category | Source | Reason |
|---|---|---|---|---|---|
| 2026-11-24 | 7dfb2ca | Reference page: added Asim et al. 2019 and Mange et al. 1997 | framing-scope | author | Supporting sources |
| 2026-11-24 | de70d7d | Opening page replaced with the author's purpose text | framing-scope | author | Clearer purpose; two questions (ECF volume, cells) |
| 2026-11-24 | e3ed73f | Step 1: one question, "Based on the vital signs and mental status, which is currently affected?" (removed duplicate line) | simplification | user-testing | "What is affected" appeared twice |
| 2026-11-24 | e3ed73f | Step 1 buttons: Circulation only, Brain only, Both, Neither | framing-scope | user-testing | Make single vs both choices unambiguous |
| 2026-11-24 | e3ed73f | Case 1 story rewritten as a sentence | framing-scope | user-testing | Read like a clinical presentation |
| 2026-11-24 | e3ed73f | Step 2 heading "Assess ECF volume"; question "What is the ECF volume?" | framing-scope | user-testing | Clearer task wording |
| 2026-11-24 | e3ed73f | Step 2 hint lists weight only when the case exam includes a weight | error-correction | user-testing | Hint named a finding absent from case 1 exam |
| 2026-11-24 | e3ed73f | Diagram labels: "ICF (cells)"; legend "ECF (interstitial and vascular; circulation)" | diagram-interaction | user-testing | Name what each compartment means |
| 2026-11-24 | e3ed73f | Diagram note: "updates with each step"; green ECF appears after step 2 | diagram-interaction | user-testing | Missing green ECF box confused a user |
| 2026-11-24 | e3ed73f | Yellow tap labels styled as buttons (shadow, underline, pointer); cue "Tap a yellow label" | diagram-interaction | user-testing | Tap targets did not look clickable |
| 2026-11-24 | e3ed73f | Per-case progress bar: "Case n of 4 · Step n of 6" | diagram-interaction | user-testing | Show progress within each case |
| 2026-11-24 | 029c9a0 | Case 1 step 2 feedback rewritten (orthostatic fall with compensatory HR rise, flat neck veins, dry mucosa; no edema argues against increased ECF) | framing-scope | user-testing | Feedback read as robotic |
| 2026-11-24 | 35bde7b | Step 3 heading "Calculate serum osmolality"; lead points to the highlighted serum results | framing-scope | user-testing | Name the task; direct attention to the labs used |
| 2026-11-24 | 35bde7b | Tap labels show reference values (osmolality < 275 / 275–295 / > 295; ECF < 14 L / 14 L / > 14 L) | diagram-interaction | user-testing | Link each choice to its value |
| 2026-11-24 | 35bde7b | Volume labels on separate rows; height arrow moved inside the ECF so labels don't cover it | diagram-interaction | user-testing | Longer labels overlapped |
| 2026-11-24 | 7ba28d6 | Step 4 heading "Predict the cellular response"; question "What is the net direction of water movement across the cell membrane?" | framing-scope | user-testing | Name the task precisely |
| 2026-11-24 | 7ba28d6 | "No movement" relabeled "no net water shift" (tap label, diagram text, score) | framing-scope | user-testing | Water still crosses; only the net shift is zero |
| 2026-11-24 | 7ba28d6 | Step 4 lead states the serum osmolality category (low/normal/high) with its value | framing-scope | user-testing | Clearer starting point |
| 2026-11-24 | 7ba28d6 | Case 1 step 4 feedback rewritten: equal tonicity, no gradient, isotonic volume contraction, no direct osmotic brain effect | framing-scope | user-testing | Name the pattern |
| 2026-11-24 | 7ba28d6 | Step 5 heading "Interpret the kidney response" | framing-scope | user-testing | Name the task |
| 2026-11-24 | 7ba28d6 | Kidney options: "Excreting excess water"; salt → sodium in question, options, feedback and urine guide | framing-scope | user-testing | Precise terms |
| 2026-11-24 | 7ba28d6 | Kidney response options "Appropriate compensation" / "Inappropriate response"; feedback openings to match | framing-scope | user-testing | Clinical wording |
| 2026-11-24 | 7a709cd | ECF volume tap labels: reference volumes removed | simplification | user-testing | Students judge ECF volume from the exam, not by calculating it |
| 2026-11-24 | 7a709cd | Diagram key: "Width = volume in the compartments · Height = osmolality · Water moves until the heights match"; legend "ECF (interstitial and vascular)" | framing-scope | user-testing | Key describes the diagram, not clinical inferences |
| 2026-11-24 | 7a709cd | "The ECF (green) appears once you assess its volume in step 2" moved into the figure (replaces "ECF: judged in step 2"); removed from below the figure | diagram-interaction | user-testing | Explain the empty ECF where the learner is looking |
| 2026-11-24 | 72d44e3 | Step 1 feedback rewritten, all 4 cases (findings, then inference; no 'Circulation:/Brain:' labels) [4 texts] | framing-scope | user-testing | Feedback read as unclear and robotic; reasoning style from author's case 1 rewrites |
| 2026-11-24 | 72d44e3 | Step 2 ECF volume feedback rewritten, cases 2–4 (supporting and opposing findings; HF pattern named) [3 texts] | framing-scope | user-testing | Feedback read as unclear and robotic; reasoning style from author's case 1 rewrites |
| 2026-11-24 | 72d44e3 | Step 3 feedback: one sentence form for all cases plus a case-specific line (new osmNote field) [4 texts] | framing-scope | user-testing | Feedback read as unclear and robotic; reasoning style from author's case 1 rewrites |
| 2026-11-24 | 72d44e3 | Step 4 feedback rewritten, cases 2–4 (tonicity, net water shift, pattern named) [3 texts] | framing-scope | user-testing | Feedback read as unclear and robotic; reasoning style from author's case 1 rewrites |
| 2026-11-24 | 72d44e3 | Step 4 brain line rewritten, all 4 cases [4 texts] | framing-scope | user-testing | Feedback read as unclear and robotic; reasoning style from author's case 1 rewrites |
| 2026-11-24 | 72d44e3 | Step 5 water, sodium and response feedback rewritten, all 4 cases [12 texts] | framing-scope | user-testing | Feedback read as unclear and robotic; reasoning style from author's case 1 rewrites |
| 2026-11-24 | 72d44e3 | Case summaries: salt → sodium, 3 cases [3 texts] | framing-scope | user-testing | Feedback read as unclear and robotic; reasoning style from author's case 1 rewrites |
