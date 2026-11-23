import { Event, fluid } from './engine';

export type Vol = 'dry' | 'euvolemic' | 'wet';
export type Danger = 'brain' | 'circulation' | 'both' | 'neither';
export type Need = 'in' | 'none' | 'out';
export type Grade = 'best' | 'ok' | 'harmful';
export type FluidId = 'ns' | 'lr' | 'd5w' | 'hts' | 'restrict' | 'loop';

const iso = (L: number): Event => ({ water: L, salt: 280 * L, glu: 5 * L });

export const FLUIDS: Record<FluidId, { name: string; detail: string; event: Event }> = {
  ns: { name: '0.9% saline, 1 L', detail: 'Na⁺ 154', event: fluid(1, 308) },
  lr: { name: "Lactated Ringer's, 1 L", detail: 'Na⁺ 130', event: fluid(1, 273) },
  d5w: { name: 'D5W, 1 L', detail: 'free water once glucose is used', event: fluid(1, 0) },
  hts: { name: '3% saline, 150 mL bolus', detail: 'Na⁺ 513 · emergency bolus only; too fast a rise risks osmotic demyelination', event: fluid(0.15, 1026) },
  restrict: { name: 'Fluid restriction', detail: '≈1 L less free water', event: fluid(-1, 0) },
  loop: { name: 'Loop diuretic', detail: '≈1.5 L urine, Na⁺ 70', event: fluid(-1.5, 140) },
};

// A causal chain link: a string, or an array of links that happen at the same time (any order accepted).
export type Link = string | string[];

export type Case = {
  id: string;
  title: string;
  // Extra practice: shown after the core cases, not required
  optional?: boolean;
  story: string;
  // The diagnosis is given; the task is the fluid physiology, not the diagnosis
  dx: string;
  // Other results that support the diagnosis or the exam findings
  tests?: string[];
  danger: { brain: string; circulation: string };   // mental status; vital signs
  exam: string[];
  volume: Vol; volumeAlso?: Vol[]; volumeNote: string;
  events: Event[];
  icfNote: string;
  brainNote: string;
  urine: { osm: number; na: number; extra?: string };
  water: 'holding' | 'dumping'; salt: 'holding' | 'losing';
  waterNote: string; saltNote: string;
  kidneyRole: 'homeostatic' | 'problem'; roleNote: string;
  // The causal chain, in order, for the end-of-case ordering task
  chain: Link[];
  debrief: { who: string; what: string; findings: string; affected: string };
  // Kept from the earlier version (not shown): danger key
  dangerKey: Danger; dangerAlso?: Danger[];
  // Treatment data kept from the earlier version; not shown (treatment is not taught)
  needEcf: Need; needCells: Need; needNote: string;
  adhUosm?: number;
  safety: string;
  specialist?: boolean;
  grades: Partial<Record<FluidId, [Grade, string]>>;
};

export const CASES: Case[] = [
  {
    id: 'diarrhea',
    title: "Acute watery diarrhea",
    story: "34-year-old with 3 days of profuse watery diarrhea after travel. Light-headed when standing.",
    dx: "Acute infectious diarrhea. Watery stool is roughly isotonic: it carries salt and water out in about the same proportion as plasma.",
    tests: ["Stool: watery, no blood"],
    danger: {"brain": "Alert and oriented.", "circulation": "HR 118, BP 96/60."},
    exam: ["Orthostatic: BP falls 22/12 mm Hg, HR rises 30/min", "Flat neck veins", "Dry mucous membranes", "No edema"],
    volume: "dry",
    volumeNote: "Orthostatic changes, flat neck veins and dry mucous membranes: ECF volume is decreased. The circulation is affected: less plasma volume means less venous return, so the heart rate rises to hold blood pressure.",
    events: [iso(-2.5)],
    icfNote: "Serum osmolality is normal, so there is no gradient across the cell membrane. ICF volume is unchanged; the whole deficit is in the ECF.",
    brainNote: "Cell volume is unchanged, so brain function is unaffected: alert and oriented.",
    urine: { osm: 650, na: 10 },
    water: "holding",
    salt: "holding",
    waterNote: "Urine osmolality 650 is well above plasma (290): the kidney is retaining water (ADH is present, stimulated by the low volume).",
    saltNote: "Urine Na⁺ 10 (below 20): the kidney is retaining salt.",
    kidneyRole: "homeostatic",
    roleNote: "Appropriate. Retaining salt and water is the right response to a decreased ECF volume. The losses are from the gut, not the kidney.",
    chain: ["Profuse watery diarrhea", "Salt and water are lost in isotonic proportion", ["ECF volume falls", "ECF osmolality is unchanged, so no water crosses the cell membrane"], "Lower plasma volume: tachycardia and orthostatic hypotension"],
    debrief: {"who": "Young adult with acute diarrhea after travel.", "what": "Stool is roughly isotonic, so salt and water left the ECF together. Osmolality did not change, so no water moved into or out of cells.", "findings": "Orthostatic, flat neck veins, dry mucosa; Na⁺ 140, serum osmolality 290, raised Hct; urine osm 650, urine Na⁺ 10.", "affected": "Circulation: continued losses can progress to hypovolemic shock. Brain: unaffected."},
    dangerKey: "circulation",
    needEcf: 'in', needCells: 'none', needNote: 'Fill the ECF; the cells are fine, so give fluid that does not change tonicity.',
    safety: 'Na⁺ is normal, so there is no sodium speed limit here. Reassess volume after each bolus and check K⁺ and HCO₃⁻, which diarrhea also depletes.',
    grades: {
      ns: ['best', 'Isotonic: stays in the ECF and refills it without moving water into or out of cells.'],
      lr: ['best', 'Near-isotonic: refills the ECF; a common first choice for GI losses.'],
      d5w: ['harmful', 'Two-thirds goes into cells and Na⁺ falls. It barely refills the circulation.'],
      hts: ['harmful', 'Pulls water out of normal cells and raises Na⁺ for no reason.'],
      restrict: ['harmful', 'The patient is already dry.'],
      loop: ['harmful', 'Removes more ECF from a dry patient.'],
    },
  },
  {
    id: 'siadh',
    title: "Low sodium with a lung mass",
    story: "66-year-old with a 50-pack-year smoking history. Chest CT shows a central lung mass; biopsy confirms small cell lung carcinoma. Routine labs show a low sodium. Mild nausea, otherwise well.",
    dx: "SIADH (syndrome of inappropriate ADH secretion). Small cell carcinoma cells secrete ADH: a paraneoplastic syndrome.",
    tests: ["TSH and morning cortisol normal", "No diuretics or other drugs that cause hyponatremia"],
    danger: {"brain": "Mild nausea; alert, no confusion.", "circulation": "HR 78, BP 132/80."},
    exam: ["No orthostatic change", "Normal neck veins", "Moist mucous membranes", "No edema"],
    volume: "euvolemic",
    volumeNote: "No orthostatic change, normal neck veins, moist mucosa, no edema: ECF volume is clinically normal, and the circulation is not affected. The ECF is in fact slightly expanded, but too little to detect at the bedside, because most of the retained water moves into cells (next steps).",
    events: [fluid(3.5, 0)],
    icfNote: "Retained water lowered ECF osmolality below the cells, so water moved into them. ICF volume is increased.",
    brainNote: "Brain cells are slightly swollen. Nausea can be an early symptom; a larger or faster fall in Na⁺ causes confusion and seizures.",
    urine: { osm: 600, na: 50 },
    water: "holding",
    salt: "losing",
    waterNote: "Urine osmolality 600 while serum osmolality is low: the kidney is retaining water. Low osmolality should switch ADH off, so ADH is coming from somewhere else.",
    saltNote: "Urine Na⁺ 50 (above 20): the kidney is excreting salt. With a normal ECF volume there is no signal to retain it; excretion matches intake.",
    kidneyRole: "problem",
    roleNote: "Contributing to the problem. The kidney itself is normal: it responds to the tumor’s ADH by retaining water, even though the low osmolality calls for excreting it.",
    chain: ["Tumor cells secrete ADH (paraneoplastic)", "ADH makes the collecting ducts reabsorb free water", "Retained water dilutes the ECF: serum Na⁺ and osmolality fall", "Water moves into cells until osmolality is equal on both sides", "About two-thirds of the retained water is now in cells, so ECF volume looks normal"],
    debrief: {"who": "Older smoker with small cell lung carcinoma.", "what": "The tumor secretes ADH, so the kidney retains free water. Most of that water moves into cells, so the patient looks euvolemic while Na⁺ and osmolality fall.", "findings": "Clinically euvolemic; Na⁺ 129, serum osmolality 268; urine osm 600, urine Na⁺ 50; normal TSH and cortisol.", "affected": "Brain: mild now; a further or faster fall causes cerebral edema. Circulation: unaffected."},
    dangerKey: "neither",
    needEcf: 'none', needCells: 'out', needNote: 'Volume is fine. The cells hold excess water.',
    adhUosm: 600,
    safety: 'Chronic hyponatremia: raise Na⁺ no more than 8–10 mmol/L in 24 h, and no more than 8 if osmotic demyelination risk is high (Na⁺ ≤105, low K⁺, alcohol use, malnutrition, liver disease). Too fast a rise can cause osmotic demyelination days later. Check Na⁺ every 4–6 h; D5W or desmopressin can bring an overshoot back down.',
    grades: {
      restrict: ['best', 'Removes the free water that ADH is holding. Slow and safe for mild symptoms.'],
      hts: ['ok', 'Reserved for severe symptoms. Mild nausea does not need it, and in chronic hyponatremia a fast rise risks osmotic demyelination.'],
      ns: ['harmful', 'The saline trap: urine (600) is more concentrated than saline (308). The kidney excretes the salt and keeps the water, so Na⁺ falls.'],
      lr: ['harmful', 'Same trap, slightly worse.'],
      d5w: ['harmful', 'More free water for a kidney that cannot excrete it.'],
      loop: ['ok', 'Sometimes combined with salt tablets to lower urine osmolality. Not first-line alone.'],
    },
  },
  {
    id: 'hf',
    title: "Breathless with swollen legs",
    story: "72-year-old with heart failure (echocardiogram 3 months ago: ejection fraction 25%). Two weeks of worsening breathlessness and leg swelling; now short of breath lying flat.",
    dx: "Acute decompensated heart failure with reduced ejection fraction.",
    tests: ["Chest X-ray: pulmonary vascular congestion, small bilateral pleural effusions", "BNP 1,450 pg/mL (raised)"],
    danger: {"brain": "Alert, mildly fatigued.", "circulation": "BP 104/70, HR 102, RR 24, SpO₂ 90% on room air; cool hands."},
    exam: ["Raised JVP", "Crackles at both lung bases", "Pitting edema to the knees", "Weight up 5 kg in 2 weeks"],
    volume: "wet",
    volumeNote: "Raised JVP, edema, crackles and a 5 kg weight gain: ECF volume is increased. Edema, crackles and congestion on the chest X-ray show that much of the extra fluid is in the interstitium. The circulation is affected, but not by low volume: with an ejection fraction of 25% the ventricle cannot move the volume it has, so forward flow is poor (cool hands, low-normal BP) and the lungs are congested.",
    events: [fluid(5, 110)],
    icfNote: "More water than salt was retained, so ECF osmolality fell below the cells and water moved into them. ICF volume is mildly increased.",
    brainNote: "Cells are mildly swollen, but the fall in osmolality is small: the patient is alert.",
    urine: { osm: 450, na: 8 },
    water: "holding",
    salt: "holding",
    waterNote: "Urine osmolality 450 despite a low serum osmolality: the kidney is retaining water. Low perfusion stimulates ADH even when osmolality is low.",
    saltNote: "Urine Na⁺ 8 (below 20): the kidney is retaining salt.",
    kidneyRole: "homeostatic",
    roleNote: "Appropriate for what the kidney senses. Low cardiac output reduces renal perfusion, so the kidney retains salt and water as it would after a volume loss, even though total ECF volume is already increased.",
    chain: ["The weak ventricle lowers cardiac output", "The kidney senses low perfusion: it retains salt, and ADH increases water retention", ["ECF volume expands", "More water than salt is retained: Na⁺ and osmolality fall"], "High venous pressure moves fluid into the interstitium: leg edema and pulmonary congestion"],
    debrief: {"who": "Older adult with heart failure, ejection fraction 25%.", "what": "The weak heart lowers renal perfusion. The kidney retains salt and, through ADH, extra water. ECF volume expands (edema, congestion), osmolality falls slightly and some water moves into cells.", "findings": "Raised JVP, crackles, edema, weight up 5 kg; congestion on chest X-ray; BNP raised; Na⁺ 131, serum osmolality 271; urine Na⁺ 8.", "affected": "Circulation: poor forward flow and pulmonary congestion. Brain: unaffected."},
    dangerKey: "circulation",
    needEcf: 'out', needCells: 'out', needNote: 'Remove ECF (salt and water), and more water than salt to bring tonicity up.',
    safety: 'Check K⁺, Mg²⁺ and creatinine during diuresis. Fluid restriction helps the Na⁺. Keep the Na⁺ rise within 8–10 mmol/L in 24 h; diuresis rarely overshoots, but vaptans can.',
    grades: {
      loop: ['best', 'Removes salt and water; the urine is hypotonic, so Na⁺ also improves. Add fluid restriction.'],
      restrict: ['ok', 'Helps Na⁺, but does not remove the excess salt driving the edema.'],
      ns: ['harmful', 'Adds salt and water to an overloaded patient. The kidney keeps it all.'],
      lr: ['harmful', 'More volume for an overloaded patient.'],
      d5w: ['harmful', 'Free water lowers Na⁺ further.'],
      hts: ['harmful', 'Adds salt load; only considered with diuretics in specialist care.'],
    },
  },
  {
    id: 'hhs',
    title: "Very high glucose, now drowsy",
    story: "70-year-old with type 2 diabetes. A week of thirst and passing large volumes of urine. Now drowsy.",
    dx: "Hyperosmolar hyperglycemic state (HHS).",
    tests: ["Serum ketones negative; arterial pH 7.36 (no ketoacidosis)"],
    danger: {"brain": "Drowsy, slow to answer.", "circulation": "HR 116, BP 94/58."},
    exam: ["Orthostatic: BP falls 20/10 mm Hg", "Flat neck veins", "Very dry mucous membranes", "No edema"],
    volume: "dry",
    volumeNote: "Orthostatic changes, flat neck veins and very dry mucous membranes: ECF volume is decreased. The circulation is affected.",
    events: [{ water: 0, glu: 1200 }, { water: -4, salt: -60 * 4, glu: -100 * 4 }],
    icfNote: "Glucose raised ECF osmolality above the cells, so water moved out of them. ICF volume is decreased, even though Na⁺ is low: the water leaving the cells dilutes the Na⁺.",
    brainNote: "Brain cells have shrunk: that explains the drowsiness.",
    urine: { osm: 550, na: 50, extra: 'Urine glucose 4+' },
    water: "dumping",
    salt: "losing",
    waterNote: "The kidney is excreting water. Urine osmolality 550 is high because of glucose, not ADH: glucose left in the tubule holds water with it (osmotic diuresis).",
    saltNote: "Urine Na⁺ 50 (above 20) despite a decreased ECF volume: the kidney is excreting salt, carried out with the glucose and water.",
    kidneyRole: "problem",
    roleNote: "Contributing to the problem. Filtered glucose exceeds what the tubule can reabsorb, and the glucose carries water and salt into the urine.",
    chain: ["Insulin deficiency: glucose accumulates in the ECF", "ECF osmolality rises", ["Water moves out of cells: cells shrink and Na⁺ is diluted", "Filtered glucose exceeds reabsorption and carries water and salt into the urine"], "Decreased ECF volume and shrunken brain cells: orthostatic and drowsy"],
    debrief: {"who": "Older adult with type 2 diabetes.", "what": "Glucose builds up in the ECF and raises osmolality, pulling water out of cells and diluting Na⁺. Glucose in the urine carries water and salt out, decreasing ECF volume.", "findings": "Glucose 1135 mg/dL; Na⁺ 133 but serum osmolality 335; dry and orthostatic; urine glucose 4+; no ketoacidosis.", "affected": "Both: brain (cells shrink) and circulation (decreased ECF volume)."},
    dangerKey: "both",
    needEcf: 'in', needCells: 'in', needNote: 'Fill the ECF first. The cells need water too, but fixing glucose with insulin will move water back into them.',
    safety: 'Use 0.9% saline first. Na⁺ will rise as glucose falls; that is expected. Track osmolality and aim for a fall of 3–8 mOsm/kg per hour, with glucose falling 4–6 mmol/L (72–108 mg/dL) per hour. Once corrected for glucose, Na⁺ should fall no more than 10 mmol/L in 24 h. Guidelines differ on when to start insulin; low-dose insulin usually follows fluids. Replace K⁺.',
    grades: {
      ns: ['best', 'Volume first. As glucose falls, water returns to cells and Na⁺ rises. Insulin follows once fluids are under way.'],
      lr: ['ok', 'Also refills volume.'],
      d5w: ['harmful', 'Adds glucose to a patient whose problem is glucose.'],
      hts: ['harmful', 'Tonicity is already high.'],
      restrict: ['harmful', 'The patient is dry.'],
      loop: ['harmful', 'Removes more volume.'],
    },
  },
  {
    id: 'marathon', optional: true,
    title: "Confused at the finish line",
    story: "28-year-old marathon runner, 4-hour race, drank water at every station. Now confused and vomiting.",
    dx: "Exercise-associated hyponatremia.",
    tests: [],
    danger: {"brain": "Confused, vomiting, headache.", "circulation": "HR 92, BP 118/74."},
    exam: ["No orthostatic change", "Normal neck veins", "Moist mucous membranes", "No edema; weight up about 1 kg"],
    volume: "euvolemic",
    volumeAlso: ['dry'],
    volumeNote: "Close to normal. Sweat salt loss decreased the ECF slightly, but not enough to detect at the bedside. The circulation is not affected.",
    events: [fluid(-3, 100), fluid(4.8, 0)],
    icfNote: "ECF osmolality fell below the cells, so water moved into them. ICF volume is increased.",
    brainNote: "Brain cells swelled: confusion, headache and vomiting. This is an emergency.",
    urine: { osm: 450, na: 40 },
    water: "holding",
    salt: "losing",
    waterNote: "Urine osmolality 450 despite a low serum osmolality: the kidney is retaining water. ADH is still being released (exercise, nausea, stress).",
    saltNote: "Urine Na⁺ 40 (above 20): the kidney is excreting salt.",
    kidneyRole: "problem",
    roleNote: "Contributing to the problem. ADH stays on, so the kidney retains water it should be excreting.",
    chain: ["Sweat loses salt and water during the race", "Drinks more water than was lost, while ADH stays on", "ECF Na⁺ and osmolality fall", "Water moves into cells", "Brain cells swell: confusion and vomiting"],
    debrief: {"who": "Endurance athlete who drank water at every station.", "what": "Sweat lost salt and water; drinking replaced it with more free water than was lost, while ADH kept the kidney retaining water. ECF osmolality fell and water moved into cells.", "findings": "Confusion, vomiting, headache, weight up; Na⁺ 131, serum osmolality 271; urine osm 450.", "affected": "Brain: cerebral edema, an emergency. Recognize it, stop further water and call for help. Circulation: unaffected."},
    dangerKey: "brain",
    needEcf: 'none', needCells: 'out', needNote: 'Volume is about right. Brain cells are swollen, so water has to come out of them.',
    adhUosm: 450,
    specialist: true,
    safety: 'Confusion and vomiting after overdrinking mean the brain is swelling. This is an emergency. An experienced team decides and monitors treatment, because raising sodium too slowly or too fast can both injure the brain. Your role: recognize it, call for help, and stop any further water. Give no IV fluids unless the team directs it.',
    grades: {
      hts: ['best', 'Symptomatic: a small hypertonic bolus raises tonicity and pulls water out of brain cells fast, with little volume. Recheck Na⁺ before repeating it.'],
      restrict: ['ok', 'Right direction, but too slow for a confused, vomiting patient.'],
      ns: ['harmful', 'With ADH on, the kidney excretes the salt in concentrated urine and keeps the water. Na⁺ falls further.'],
      lr: ['harmful', 'Hypotonic to this urine: adds free water and lowers Na⁺.'],
      d5w: ['harmful', 'Pure free water into swollen brain cells.'],
      loop: ['ok', 'Can help shed free water, but does not act fast enough on its own.'],
    },
  },
  {
    id: 'addison', optional: true,
    title: "Weak, dizzy and darker skin",
    story: "41-year-old with months of fatigue, weight loss and salt craving. Skin creases look darker.",
    dx: "Primary adrenal insufficiency (Addison’s disease): no aldosterone or cortisol.",
    tests: ["Serum K⁺ 5.8 (high)", "Morning cortisol low; ACTH high"],
    danger: {"brain": "Tired but oriented.", "circulation": "HR 112, BP 88/54, faint on standing."},
    exam: ["Orthostatic hypotension", "Flat neck veins", "Dry mucous membranes", "Hyperpigmented palmar creases"],
    volume: "dry",
    volumeNote: "Orthostatic hypotension, flat neck veins and dry mucosa: ECF volume is decreased. The circulation is affected.",
    events: [fluid(-2, 650)],
    icfNote: "Salt was lost in excess of water, so ECF osmolality fell and water moved into the cells. ICF volume is increased even though ECF volume is decreased.",
    brainNote: "Cells are swollen, but the patient is oriented: the fall in osmolality is moderate.",
    urine: { osm: 400, na: 60 },
    water: "holding",
    salt: "losing",
    waterNote: "Urine osmolality 400: the kidney is retaining water. The low volume stimulates ADH.",
    saltNote: "Urine Na⁺ 60 in a patient with decreased ECF volume: the kidney is excreting salt it should be retaining. Without aldosterone it cannot retain it.",
    kidneyRole: "problem",
    roleNote: "Contributing to the problem. Without aldosterone the kidney loses salt despite a decreased ECF volume.",
    chain: ["No aldosterone", "The kidney excretes salt", ["ECF volume falls", "Low volume stimulates ADH; retained water lowers osmolality"], "Water moves into cells"],
    debrief: {"who": "Adult with months of fatigue, weight loss, salt craving and darker skin.", "what": "Without aldosterone the kidney loses salt and ECF volume falls. The low volume stimulates ADH, so water is retained and osmolality falls; water moves into cells.", "findings": "Hypotension, orthostatic, dry; Na⁺ 130, K⁺ 5.8, raised Hct; urine Na⁺ 60; darker skin creases.", "affected": "Circulation: adrenal crisis can cause shock, an emergency. Brain: mildly affected."},
    dangerKey: "circulation",
    needEcf: 'in', needCells: 'out', needNote: 'Fill the ECF with salt. Restoring tonicity will draw water back out of the cells.',
    safety: 'Give hydrocortisone 100 mg IV at once; do not wait for test results. Overshoot risk: once volume and cortisol are restored, ADH switches off and a water diuresis can raise Na⁺ too fast. Check Na⁺ every 2–4 h and keep the rise within 8–10 mmol/L in 24 h. If it rises faster, D5W or desmopressin can bring it back down.',
    grades: {
      ns: ['best', 'Restores salt and volume. Give hydrocortisone too; that fixes the cause.'],
      lr: ['ok', 'Refills volume, but less sodium than saline.'],
      d5w: ['harmful', 'Free water lowers Na⁺ further and barely fills the circulation.'],
      hts: ['ok', 'Only for severe neurologic symptoms; volume is the main need here.'],
      restrict: ['harmful', 'The patient is dry.'],
      loop: ['harmful', 'Removes more salt and volume.'],
    },
  },
  {
    id: 'dehydration', optional: true,
    title: "Found at home after a hot weekend",
    story: "84-year-old with dementia, found at home after a heat wave. Has not been drinking.",
    dx: "Hypernatremia from inadequate water intake.",
    tests: [],
    danger: {"brain": "Drowsy and confused.", "circulation": "HR 104, BP 108/66."},
    exam: ["Mildly orthostatic", "Flat neck veins", "Very dry mucous membranes", "No edema"],
    volume: "dry",
    volumeNote: "Mildly orthostatic, flat neck veins, very dry mucosa: ECF volume is decreased, though less than you might expect, because most of the water lost came from the cells. The circulation is mildly affected.",
    events: [fluid(-4, 0)],
    icfNote: "Water loss raised ECF osmolality above the cells, so water moved out of them. ICF volume is decreased.",
    brainNote: "Brain cells have shrunk: drowsiness and confusion.",
    urine: { osm: 900, na: 15 },
    water: "holding",
    salt: "holding",
    waterNote: "Urine osmolality 900, near maximal: the kidney is retaining water (ADH strongly stimulated).",
    saltNote: "Urine Na⁺ 15 (below 20): the kidney is retaining salt.",
    kidneyRole: "homeostatic",
    roleNote: "Appropriate. The kidney is retaining all the water and salt it can; the problem is intake.",
    chain: ["No water intake through a heat wave", "Water is lost without salt: ECF osmolality rises", "Water moves out of cells", "Brain cells shrink: drowsiness"],
    debrief: {"who": "Frail older adult with dementia, alone through a heat wave.", "what": "Water kept being lost but none was drunk. ECF osmolality rose and water left the cells.", "findings": "Drowsy, very dry, orthostatic; Na⁺ 155, serum osmolality 321; urine osm 900.", "affected": "Both: brain (cells shrink) and, mildly, circulation."},
    dangerKey: "both",
    needEcf: 'in', needCells: 'in', needNote: 'Mostly cells need water back; the ECF needs a little.',
    safety: 'Treat shock first with saline. Then lower Na⁺ no faster than 0.5 mmol/L per hour (10–12 mmol/L in 24 h) when the hypernatremia is chronic or of unknown duration; faster lowering risks cerebral edema. Check Na⁺ every 2–4 h.',
    grades: {
      d5w: ['best', 'Free water goes where it is needed: mostly into the cells. Lower Na⁺ by no more than 10–12 mmol/L in 24 h.'],
      ns: ['ok', 'Use first only if hypotensive. It is hypotonic to this patient, but barely restores cell water.'],
      lr: ['ok', 'Similar to saline: fills volume, slow to fix tonicity.'],
      hts: ['harmful', 'Shrinks cells that are already shrunken.'],
      restrict: ['harmful', 'The patient needs water.'],
      loop: ['harmful', 'Removes more water.'],
    },
  },
  {
    id: 'di', optional: true,
    title: "Thirsty on lithium",
    story: "45-year-old on lithium for 10 years. Passing large volumes of urine, constantly thirsty. Admitted after a fall; no water overnight.",
    dx: "Nephrogenic diabetes insipidus caused by lithium.",
    tests: [],
    danger: {"brain": "Irritable and confused.", "circulation": "HR 98, BP 118/72."},
    exam: ["Mildly orthostatic", "Normal neck veins", "Dry mucous membranes", "No edema"],
    volume: "dry",
    volumeAlso: ['euvolemic'],
    volumeNote: "Mildly decreased. Pure water loss comes about two-thirds from cells, so ECF volume changes little. The circulation is barely affected.",
    events: [fluid(-3.5, 0)],
    icfNote: "Water loss raised ECF osmolality above the cells, so water moved out of them. ICF volume is decreased.",
    brainNote: "Brain cells have shrunk: irritability and confusion.",
    urine: { osm: 90, na: 15 },
    water: "dumping",
    salt: "holding",
    waterNote: "Urine osmolality 90 while serum osmolality is high: the kidney is excreting water it should retain. Lithium blocks the action of ADH.",
    saltNote: "Urine Na⁺ 15 (below 20): the kidney is retaining salt.",
    kidneyRole: "problem",
    roleNote: "Contributing to the problem. The kidney cannot respond to ADH, so it keeps losing water.",
    chain: ["Lithium blocks ADH's action in the kidney", "The kidney passes large volumes of dilute urine", "No water overnight: ECF osmolality rises", "Water moves out of cells", "Brain cells shrink: confusion"],
    debrief: {"who": "Adult on lithium for years.", "what": "Lithium makes the kidney unresponsive to ADH (nephrogenic diabetes insipidus). Drinking kept up with the losses until there was no water overnight; osmolality rose and water left the cells.", "findings": "Large urine volumes, thirst, confusion; Na⁺ 153, serum osmolality 316; urine osm 90.", "affected": "Brain: cells shrink. It worsens quickly whenever the patient cannot drink."},
    dangerKey: "brain",
    dangerAlso: ["both"],
    needEcf: 'none', needCells: 'in', needNote: 'The cells need water back; volume is close to normal.',
    safety: 'Lower Na⁺ no more than 10–12 mmol/L in 24 h if it is chronic. Large volumes of D5W can cause hyperglycemia, which drives more urine loss; oral water is preferred if the patient can drink. Review lithium with the prescriber, as nephrogenic DI can persist after it is stopped.',
    grades: {
      d5w: ['best', 'Free water refills the cells. Also stop or review the lithium.'],
      ns: ['ok', 'Not harmful, but slow to fix tonicity, and the salt load increases urine output.'],
      lr: ['ok', 'Similar to saline.'],
      hts: ['harmful', 'Shrinks cells further.'],
      restrict: ['harmful', 'This kidney cannot conserve water; restriction is dangerous.'],
      loop: ['harmful', 'More water loss.'],
    },
  },
];
