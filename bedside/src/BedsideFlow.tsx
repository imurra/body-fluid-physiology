/*
 * Body Fluids at the Bedside: Volume and Osmolality
 * Copyright (c) 2026 Ian Victor Joseph Murray · CC BY-NC-SA 4.0
 * http://creativecommons.org/licenses/by-nc-sa/4.0/
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BASE, labs, run } from './engine';
import { CASES, Case, Vol, Danger } from './cases';

const TITLE = 'Body Fluids at the Bedside';
const STEPS = ['What is affected', 'ECF volume', 'Osmolality', 'Cells', 'Kidney', 'Causal chain'];
const NORMAL = 290;                         // serum osmolality, mOsm/kg
const OSM_LO = 275, OSM_HI = 295;           // reference range
const DIRWORD: Record<-1 | 0 | 1, string> = { [-1]: 'low', 0: 'normal', 1: 'high' };
const VOLWORD: Record<Vol, string> = { dry: 'decreased', euvolemic: 'normal', wet: 'increased' };
const CORE = CASES.length;
const caseLabel = (i: number) => `Case ${i + 1} of ${CORE}`;
const OSM_SNAPS: Record<-1 | 0 | 1, number> = { [-1]: 250, 0: NORMAL, 1: 330 };

type Snap = -1 | 0 | 1;
type Result = { aff?: boolean; vol?: boolean; osm?: boolean; why?: boolean; icf?: boolean; water?: boolean; salt?: boolean; role?: boolean; chain?: boolean };
const SCORED: [keyof Result, string][] = [
  ['aff', 'What is affected'], ['vol', 'ECF volume'], ['osm', 'Osmolality'], ['why', 'Cells: gradient'], ['icf', 'Cells: water movement'],
  ['water', 'Kidney: water'], ['salt', 'Kidney: salt'], ['role', 'Kidney: response'], ['chain', 'Causal chain'],
];

// Fixed shuffle per case so the chain never starts in order.
function shuffled(n: number, seed: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let x = seed * 9301 + 49297;
  for (let i = n - 1; i > 0; i--) { x = (x * 9301 + 49297) % 233280; const j = Math.floor((x / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.every((v, i) => v === i) ? a.reverse() : a;
}

// Flatten a chain into links, each with its position. Links that happen at the same time share a position.
function flatChain(c: Case) {
  const items: { text: string; pos: number }[] = [];
  c.chain.forEach((l, pos) => (Array.isArray(l) ? l : [l]).forEach(text => items.push({ text, pos })));
  return items;
}

const f0 = (n: number) => Math.round(n).toString();
const f1 = (n: number) => n.toFixed(1);
const dirOf = (d: number, eps: number): Snap => (d > eps ? 1 : d < -eps ? -1 : 0);

// ---------- Diagram ----------
type Line = { v: number; text: string; kind: 'pred' | 'truth' | 'wrong' };
type DiagramProps = {
  ecf: number | null; icf: number;
  osm: number;                       // cell osmolality (and ECF unless ecfOsm is given)
  ecfOsm?: number;                   // ECF osmolality when it differs from the cells (before water moves)
  showOsm?: boolean;                 // label each compartment's osmolality
  lines?: Line[];                    // osmolality lines: the student's prediction, the lab value
  preEcf?: { ecf: number; osm: number } | null;   // dotted ECF outline before water moved
  arrow?: Snap | null;               // water across the membrane: 1 into cells, -1 out, 0 none
  arrowGuess?: boolean;              // the arrow is the student's prediction
  max?: number;                      // top of the osmolality axis
};

function Diagram({ ecf, icf, osm, ecfOsm, showOsm, lines = [], preEcf, arrow, arrowGuess, max = 380 }: DiagramProps) {
  const W = 600, H = 320, PX = 9, left = 52, mem = left + 36 * PX, top = 24, bottom = 262, MAX = max;
  const y = (o: number) => bottom - (Math.min(o, MAX) / MAX) * (bottom - top);
  const icfY = y(osm);
  const ecfY = y(ecfOsm ?? osm);
  const box = (x: number, yy: number, w: number, h: number) =>
    ({ x, y: yy, width: w, height: h, style: { x, y: yy, width: w, height: h } as React.CSSProperties });
  const lowY = Math.max(icfY, ecfY);
  const ay = lowY + (bottom - lowY) * 0.42;
  const word = arrowGuess ? 'your prediction: ' : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dy-svg" role="img"
      aria-label={`ICF ${f1(icf)} liters at ${f0(osm)} mOsm/kg${ecf != null ? `, ECF ${f1(ecf)} liters at ${f0(ecfOsm ?? osm)} mOsm/kg` : ''}`}>
      {[0, 100, 200, 300, 400].filter(t => t <= MAX).map(t => (
        <g key={t}>
          <line x1={left} x2={W - 12} y1={y(t)} y2={y(t)} className="grid" />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" className="tick">{t}</text>
        </g>
      ))}
      <text x={14} y={(top + bottom) / 2} textAnchor="middle" className="tick" transform={`rotate(-90 14 ${(top + bottom) / 2})`}>Osmolality (mOsm/kg)</text>

      <rect {...box(mem - icf * PX, icfY, icf * PX, bottom - icfY)} className="icf" />
      {ecf != null && <rect {...box(mem, ecfY, ecf * PX, bottom - ecfY)} className="ecf" />}

      {preEcf && <>
        <rect x={mem} y={y(preEcf.osm)} width={preEcf.ecf * PX} height={bottom - y(preEcf.osm)} className="preoutline" />
        <text x={mem + preEcf.ecf * PX - 4} y={y(preEcf.osm) - 6} textAnchor="end" className="osmtext ecf-t">before water moved {f0(preEcf.osm)}</text>
      </>}

      <rect x={mem - BASE.icf * PX} y={y(NORMAL)} width={BASE.icf * PX} height={bottom - y(NORMAL)} className="normal" />
      <rect x={mem} y={y(NORMAL)} width={BASE.ecf * PX} height={bottom - y(NORMAL)} className="normal" />
      <line x1={left} x2={W - 12} y1={y(NORMAL)} y2={y(NORMAL)} className="ref" />
      <text x={W - 14} y={y(NORMAL) - 6} textAnchor="end" className="reftext">normal {NORMAL}</text>

      {lines.map(l => (
        <g key={l.kind}>
          <line x1={left} x2={W - 12} y1={y(l.v)} y2={y(l.v)} className={l.kind === 'truth' ? 'tonline' : 'wrongline'} />
          <text x={left + 6} y={y(l.v) + (l.kind === 'truth' ? 16 : -6)} className="predtext">{l.text}</text>
        </g>
      ))}

      {showOsm && ecf != null && <>
        <text x={mem - 8} y={icfY - 6} textAnchor="end" className="osmtext icf-t">cells {f0(osm)}</text>
        <text x={mem + 8} y={ecfY - 6} className="osmtext ecf-t">ECF {f0(ecfOsm ?? osm)}</text>
      </>}

      <line x1={mem} x2={mem} y1={top - 8} y2={bottom} className="membrane" />
      <text x={mem} y={top - 12} textAnchor="middle" className="tick">cell membrane</text>

      {arrow === 1 && <g className={`arrow ${arrowGuess ? 'guess' : ''}`}>
        <line x1={mem + 56} x2={mem - 52} y1={ay} y2={ay} />
        <path d={`M ${mem - 64} ${ay} l 14 -8 v 16 z`} />
        <text x={mem} y={ay - 12} textAnchor="middle" className="arrowtext">{word}water in</text>
      </g>}
      {arrow === -1 && <g className={`arrow ${arrowGuess ? 'guess' : ''}`}>
        <line x1={mem - 56} x2={mem + 52} y1={ay} y2={ay} />
        <path d={`M ${mem + 64} ${ay} l -14 -8 v 16 z`} />
        <text x={mem} y={ay - 12} textAnchor="middle" className="arrowtext">{word}water out</text>
      </g>}
      {arrow === 0 && <text x={mem} y={ay} textAnchor="middle" className="arrowtext">{word}no water movement</text>}

      <text x={mem - (icf * PX) / 2} y={bottom - 14} textAnchor="middle" className="lab icf-t">ICF</text>
      {ecf != null && <text x={mem + (ecf * PX) / 2} y={bottom - 14} textAnchor="middle" className="lab ecf-t">ECF</text>}
      {ecf == null && <text x={mem + 12} y={(top + bottom) / 2 + 30} className="tick">ECF: judged in step 2</text>}

      <line x1={left} x2={W - 12} y1={bottom} y2={bottom} className="axis" />
      {[30, 20, 10].map(v => <text key={`i${v}`} x={mem - v * PX} y={bottom + 16} textAnchor="middle" className="tick">{v}</text>)}
      {[10, 20].map(v => <text key={`e${v}`} x={mem + v * PX} y={bottom + 16} textAnchor="middle" className="tick">{v}</text>)}
      <text x={mem - 10} y={bottom + 38} textAnchor="end" className="tick">← ICF volume (L)</text>
      <text x={mem + 10} y={bottom + 38} className="tick">ECF volume (L) →</text>
    </svg>
  );
}

// ---------- small UI pieces ----------
function Choice<T extends string | number>({ options, value, onPick, disabled, label }: {
  options: { v: T; text: string }[]; value: T | undefined; onPick: (v: T) => void; disabled?: boolean; label: string;
}) {
  return (
    <div className="choices" role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.v)} aria-pressed={value === o.v} disabled={disabled} onClick={() => onPick(o.v)}>{o.text}</button>
      ))}
    </div>
  );
}

const Verdict = ({ ok, label, children }: { ok: boolean | 'ok'; label?: string; children: React.ReactNode }) => (
  <div className={`verdict ${ok === true ? 'good' : ok === 'ok' ? 'meh' : 'bad'}`}>
    {label && <b>{label}: </b>}<b>{ok === true ? 'Correct.' : ok === 'ok' ? 'Partly.' : 'Not quite.'}</b> {children}
  </div>
);

const RefRanges = () => (
  <table className="reftable"><tbody>
    <tr><td>Serum Na⁺</td><td>135–145 mEq/L</td></tr>
    <tr><td>Glucose</td><td>70–100 mg/dL</td></tr>
    <tr><td>BUN</td><td>7–20 mg/dL</td></tr>
    <tr><td>Serum osmolality</td><td>{OSM_LO}–{OSM_HI} mOsm/kg</td></tr>
  </tbody></table>
);

const UrineGuide = () => (
  <>
    <table className="reftable"><tbody>
      <tr><td>U<sub>osm</sub> ≤ 100 mOsm/kg</td><td>Excreting water: maximally dilute urine (ADH suppressed or not acting)</td></tr>
      <tr><td>U<sub>osm</sub> &gt; 100 mOsm/kg</td><td>Retaining water: ADH is acting</td></tr>
      <tr><td>U<sub>Na</sub> ≤ 30 mEq/L</td><td>Retaining salt: the kidney senses low effective volume</td></tr>
      <tr><td>U<sub>Na</sub> &gt; 30 mEq/L</td><td>Excreting salt (normal volume, diuretics, or renal salt loss)</td></tr>
    </tbody></table>
    <p className="hint">Cutoffs from the European hyponatraemia guideline (Spasovski et al., 2014). Exception: a large amount of glucose in the urine raises urine osmolality while the kidney is losing water (osmotic diuresis).</p>
  </>
);

// ---------- Opening screen ----------
function Intro({ onStart, started }: { onStart: () => void; started: boolean }) {
  return (
    <section className="panel intro" aria-label="About this activity">
      <h2>What this activity is for</h2>
      <p>Serum sodium answers two different questions. The <b>amount</b> of sodium in the body sets <b>ECF volume</b>, which you judge from the vital signs and the exam; it tells you whether the <b>circulation</b> is affected. The sodium <b>concentration</b> (with glucose) sets <b>serum osmolality</b>, which decides whether water moves into or out of <b>cells</b>; brain cells show it first.</p>
      <p>Each patient’s diagnosis is given. Your task is not to make the diagnosis. It is to work out what the disorder does to the body’s fluid compartments, and why.</p>
      <h3>Reading the diagram</h3>
      <ul>
        <li>Cells (ICF, pink) are on the left; ECF (green) is on the right; the vertical line is the cell membrane.</li>
        <li>Width is volume (L). Height is osmolality (mOsm/kg). Dashed outlines show normal: ICF 28 L, ECF 14 L, 290 mOsm/kg.</li>
        <li>Water crosses the membrane until osmolality is equal on both sides.</li>
      </ul>
      <h3>Each case has six steps</h3>
      <ol>
        <li><b>What is affected</b>, from the vital signs and mental status: the circulation, the brain, both or neither?</li>
        <li><b>ECF volume</b> from the exam: decreased, normal or increased?</li>
        <li><b>Osmolality</b> from Na⁺, glucose and BUN.</li>
        <li><b>Cells</b>: which way water moves, and what that means for the brain.</li>
        <li><b>Kidney</b>: what the urine shows, and whether the response is appropriate.</li>
        <li><b>Causal chain</b>, then a case summary.</li>
      </ol>
      <p className="hint">Four cases, about 5 minutes each.</p>
      <div className="row"><button className="primary" onClick={onStart}>{started ? 'Back to the case' : 'Start case 1'}</button></div>
    </section>
  );
}

// ---------- Reference ----------
// Each source carries a note on what it supports in this activity.
const SOURCES: { text: string; url?: string; why: string }[] = [
  { text: 'Bagby SP, Bennett WM. Differentiating disorders of ECF volume/Na content regulation from disorders of water/Na concentration regulation. Adv Physiol Educ 1998;20:S169–S184', url: 'https://doi.org/10.1152/advances.1998.275.6.S169',
    why: 'Describes the confusion this activity targets: the amount of sodium (ECF volume) versus its concentration (osmolality).' },
  { text: 'Cheng HM, Hoe SZ. Students lose balance over the yin-yang of sodium physiology. BLDE Univ J Health Sci 2018;3:54–57', url: 'https://doaj.org/article/71b5956a6951442aba58dff52ca47bf4',
    why: 'Shows that students still fail to separate sodium balance from sodium concentration.' },
  { text: 'Darrow DC, Yannet H. The changes in the distribution of body water accompanying increase and decrease in extracellular electrolyte. J Clin Invest 1935;14:266–275', url: 'https://doi.org/10.1172/JCI100674',
    why: 'Origin of the fluid compartment diagram used here (volume on one axis, osmolality on the other).' },
  { text: 'Spasovski G, et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia. Eur J Endocrinol 2014;170:G1–G47', url: 'https://doi.org/10.1530/EJE-13-1020',
    why: 'Source of the urine cutoffs in the Kidney step (urine osmolality 100 mOsm/kg; urine Na⁺ 30 mEq/L) and of grading hyponatremia symptoms by severity, used in “What is affected?” (nausea counts as a moderately severe symptom).' },
  { text: 'Verbalis JG, et al. Diagnosis, evaluation, and treatment of hyponatremia: expert panel recommendations. Am J Med 2013;126:S1–S42', url: 'https://doi.org/10.1016/j.amjmed.2013.07.006',
    why: 'Diagnostic criteria for SIADH used in case 2: low serum osmolality, concentrated urine, urine Na⁺ above 30, clinical euvolemia, and normal thyroid and adrenal function.' },
  { text: 'Umpierrez GE, et al. Hyperglycemic crises in adults with diabetes: a consensus report. Diabetes Care 2024;47:1257–1275', url: 'https://doi.org/10.2337/dci24-0032',
    why: 'Diagnostic criteria for HHS used in case 4: glucose ≥ 600 mg/dL, effective osmolality > 300 or total osmolality > 320 mOsm/kg, pH ≥ 7.3, without significant ketosis.' },
  { text: 'White RT, Gunstone RF. Probing Understanding. London: Falmer Press; 1992',
    why: 'Predict–observe–explain, the structure of each step: students predict, the diagram shows the result, and the feedback explains it.' },
];

// Plain-language background on each condition (MedlinePlus, US National Library of Medicine)
const LEARN: Record<string, { text: string; url: string }> = {
  diarrhea: { text: 'Dehydration', url: 'https://medlineplus.gov/ency/article/000982.htm' },
  siadh: { text: 'SIADH', url: 'https://medlineplus.gov/ency/article/000314.htm' },
  hf: { text: 'Heart failure', url: 'https://medlineplus.gov/heartfailure.html' },
  hhs: { text: 'Hyperglycemic hyperosmolar syndrome', url: 'https://medlineplus.gov/ency/article/000304.htm' },
};

const STATES: [string, string, string, string][] = [
  ['Osm ↑ · ECF ↓', 'Hyperosmotic contraction', 'Water loss without enough intake, diabetes insipidus, hyperglycemia', 'Cells shrink'],
  ['Osm ↑ · ECF ↑', 'Hyperosmotic expansion', 'Hypertonic saline, salt ingestion, NaHCO₃', 'Cells shrink'],
  ['Osm — · ECF ↓', 'Isosmotic contraction', 'Diarrhea, hemorrhage, burns', 'No change'],
  ['Osm — · ECF ↑', 'Isosmotic expansion', 'Isotonic saline overload', 'No change'],
  ['Osm ↓ · ECF ↓', 'Hyposmotic contraction', 'Diuretics, adrenal insufficiency, losses replaced with water', 'Cells swell'],
  ['Osm ↓ · ECF ↑ or normal', 'Hyposmotic expansion', 'SIADH, water intoxication, heart failure, cirrhosis', 'Cells swell'],
];

function Reference({ onClose }: { onClose: () => void }) {
  return (
    <section className="panel refpage" aria-label="Reference">
      <div className="row"><h2 style={{ margin: 0 }}>Reference</h2><span className="spacer" style={{ flex: 1 }} /><button className="linkbtn" onClick={onClose}>Back to the case</button></div>

      <h3>Serum osmolality</h3>
      <ul>
        <li>Calculated osmolality = 2 × Na⁺ + glucose/18 + BUN/2.8 (glucose and BUN in mg/dL). The laboratory also measures it directly.</li>
        <li>Na⁺ (with its anions) accounts for most of it, so Na⁺ usually tracks osmolality. Very high glucose is the exception: Na⁺ can be low while osmolality is high.</li>
        <li>Urea crosses cell membranes, so it raises osmolality on both sides equally and does not move water. BUN is raised in cases 1 and 4.</li>
      </ul>
      <RefRanges />

      <h3>The diagram</h3>
      <ul>
        <li>The cell membrane is the vertical line. ICF (cells, pink) is on the left; ECF (green) is on the right.</li>
        <li>Width is volume (L). Height is osmolality (mOsm/kg). Dashed outlines show normal: ICF 28 L, ECF 14 L, 290 mOsm/kg.</li>
        <li>Water moves until both sides have the same osmolality: ECF osmolality down → cells swell; up → cells shrink.</li>
      </ul>

      <h3>The six states</h3>
      <table className="reftable"><thead><tr><th>Osmolality · ECF volume</th><th>State</th><th>Common causes</th><th>Cells</th></tr></thead>
        <tbody>{STATES.map(r => <tr key={r[1]}>{r.map((x, k) => <td key={k}>{x}</td>)}</tr>)}</tbody></table>

      <h3>Reading the urine</h3>
      <UrineGuide />

      <h3>Key points from the core cases</h3>
      <ul>
        <li><b>Case 1:</b> isotonic loss decreases ECF volume but leaves ICF volume unchanged, because osmolality does not change.</li>
        <li><b>Case 2:</b> in SIADH, most retained water moves into cells, so ECF volume looks normal at the bedside.</li>
        <li><b>Case 3:</b> in heart failure, low renal perfusion keeps the kidney retaining salt and water even though ECF volume is increased.</li>
        <li><b>Case 4:</b> very high glucose lowers Na⁺ while raising osmolality, so cells shrink.</li>
      </ul>

      <h3>The cases</h3>
      <table className="reftable"><thead><tr><th>Case</th><th>What happened</th><th>Learn more</th></tr></thead><tbody>
        {CASES.map((k, i) => {
          const more = LEARN[k.id];
          return <tr key={k.id}><td>{i + 1}. {k.title}</td><td>{k.debrief.what}</td><td>{more && <a href={more.url} target="_blank" rel="noopener">{more.text}</a>}</td></tr>;
        })}
      </tbody></table>

      <h3>Teaching model</h3>
      <p>42 L total body water (ICF 28 L, ECF 14 L). Na⁺ salts and glucose stay in the ECF; ICF solute is fixed; urea spreads through all body water. Osmolality is shown in mOsm/kg, taking 1 L of body water as 1 kg. Urine values are typical values chosen to match the guideline cutoffs. This is a teaching tool, not a guide to treatment.</p>

      <h3>Sources</h3>
      <p className="hint">Each source is followed by what it supports in this activity.</p>
      <ol className="sources">{SOURCES.map(x => <li key={x.text}>{x.url ? <a href={x.url} target="_blank" rel="noopener">{x.text}</a> : x.text}<br /><span className="why">{x.why}</span></li>)}</ol>
    </section>
  );
}

// ---------- App ----------
export default function BedsideFlow() {
  const [showIntro, setShowIntro] = useState(true);
  const [started, setStarted] = useState(false);
  const [ci, setCi] = useState(0);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [aff, setAff] = useState<Danger>();
  const [vol, setVol] = useState<Vol>();
  const [osmGuess, setOsmGuess] = useState<Snap>();
  const [osmChecked, setOsmChecked] = useState(false);
  const [why, setWhy] = useState<Snap>();             // which side is higher: 1 cells higher (water in), -1 ECF higher (water out), 0 equal
  const [icfGuess, setIcfGuess] = useState<Snap>();
  const [icfChecked, setIcfChecked] = useState(false);
  const [water, setWater] = useState<'holding' | 'dumping'>();
  const [salt, setSalt] = useState<'holding' | 'losing'>();
  const [role, setRole] = useState<'homeostatic' | 'problem'>();
  const [kidneyChecked, setKidneyChecked] = useState(false);
  const [order, setOrder] = useState<number[]>([]);   // chain links in the order tapped
  const [chainChecked, setChainChecked] = useState(false);
  const [result, setResult] = useState<Result>({});
  const [flash, setFlash] = useState(0);
  const [history, setHistory] = useState<Record<string, Result>>({});
  const [showRef, setShowRef] = useState(false);
  const [shift, setShift] = useState<'before' | 'after'>('after');   // cells step: before or after water moves
  const timer = useRef<number>();
  const playShift = () => {
    window.clearTimeout(timer.current);
    setShift('before');
    timer.current = window.setTimeout(() => setShift('after'), 2200);
  };
  const showShift = (v: 'before' | 'after') => { window.clearTimeout(timer.current); setShift(v); };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const c = CASES[ci];
  const truth = useMemo(() => run(c.events).final, [ci]);
  const L = labs(truth);
  const labNa = Math.round(L.na);
  const labGlu = Math.round(L.glucose);
  const labBun = Math.round(L.bun);
  const calcOsm = 2 * labNa + labGlu / 18 + labBun / 2.8;
  const osmDir: Snap = calcOsm < OSM_LO ? -1 : calcOsm > OSM_HI ? 1 : 0;
  const osmLab = Math.round(calcOsm);   // shown as the measured value
  const truthIcfDir = dirOf(truth.icf - BASE.icf, 0.1);
  // Cells start at their normal effective osmolality plus this patient's urea (urea crosses cell membranes).
  const cellsStart = Math.round(BASE.icfEff / BASE.icf + labBun / 2.8);
  const scaleMax = 380;
  const flat = useMemo(() => flatChain(c), [ci]);
  const pool = useMemo(() => shuffled(flat.length, ci + 3), [ci]);

  const reset = (i: number) => {
    setCi(i); setStep(0); setMaxStep(0); setAff(undefined); setVol(undefined); setOsmGuess(undefined); setOsmChecked(false); setWhy(undefined);
    setIcfGuess(undefined); setIcfChecked(false); setWater(undefined); setSalt(undefined); setRole(undefined); setKidneyChecked(false);
    setOrder([]); setChainChecked(false); setResult({}); showShift('after');
  };

  const volOk = vol != null && (vol === c.volume || (c.volumeAlso ?? []).includes(vol));

  // What the diagram shows. Every value is the patient's own: ECF volume as examined, serum osmolality as measured.
  // The cells start at normal; in the Cells step water moves until they match the serum.
  const examEcf = { ecf: truth.ecf, icf: BASE.icf, osm: cellsStart };
  const gradient = { ...examEcf, ecfOsm: osmLab };
  const final = { ecf: truth.ecf, icf: truth.icf, osm: osmLab };
  const osmLine: Line = { v: osmLab, text: `Serum osmolality ${osmLab}`, kind: 'truth' };
  const guessLine = (g: Snap | undefined): Line[] => g != null ? [{ v: OSM_SNAPS[g], text: 'your answer', kind: 'pred' }] : [];
  let diag: React.ReactNode;
  if (step === 0 || (step === 1 && vol == null)) diag = <Diagram max={scaleMax} ecf={null} icf={BASE.icf} osm={cellsStart} />;
  else if (step === 1 || (step === 2 && !osmChecked)) diag = <Diagram max={scaleMax} {...examEcf} lines={step === 2 ? guessLine(osmGuess) : []} />;
  else if (step === 2) diag = <Diagram max={scaleMax} {...gradient} showOsm lines={[osmLine, ...(osmGuess != null && osmGuess !== osmDir ? guessLine(osmGuess).map(l => ({ ...l, kind: 'wrong' as const })) : [])]} />;
  else if (step === 3 && (!icfChecked || shift === 'before'))
    diag = <Diagram max={scaleMax} {...gradient} showOsm arrow={icfChecked ? truthIcfDir : icfGuess ?? null} arrowGuess={!icfChecked} />;
  else if (step === 3) diag = <Diagram max={scaleMax} {...final} showOsm arrow={truthIcfDir} />;
  else diag = <Diagram max={scaleMax} {...final} showOsm />;

  // Only the first answer to each question is scored; Reset and Back never change it.
  const record = (r: Result) => setResult(prev => {
    const next: Result = { ...prev };
    (Object.keys(r) as (keyof Result)[]).forEach(k => { if (next[k] === undefined) (next as any)[k] = r[k]; });
    return next;
  });
  const go = (n: number) => { setStep(n); setMaxStep(m => Math.max(m, n)); };
  const redo = (n: number) => {
    if (n === 0) setAff(undefined);
    if (n === 1) setVol(undefined);
    if (n === 2) { setOsmGuess(undefined); setOsmChecked(false); }
    if (n === 3) { setIcfGuess(undefined); setWhy(undefined); setIcfChecked(false); showShift('after'); }
    if (n === 4) { setWater(undefined); setSalt(undefined); setRole(undefined); setKidneyChecked(false); }
    if (n === 5) { setOrder([]); setChainChecked(false); }
  };
  const resetBtn = (n: number) => (
    <button className="linkbtn" onClick={() => redo(n)} title="Clear your answer to this step and try again. Your first answer is still the one scored.">Reset this step</button>
  );
  const answered = [aff != null, vol != null, osmChecked, icfChecked, kidneyChecked, chainChecked][step] ?? false;
  const pts = SCORED.filter(([k]) => result[k] === true).length;

  const start = () => { setShowIntro(false); setStarted(true); };
  const chainOk = chainChecked && order.every((k, i) => flat[k].pos === flat[i].pos);

  return (
    <div className="dy">
      <header className="top">
        <div>
          <div className="eyebrow">Volume and osmolality</div>
          <h1>{TITLE}</h1>
        </div>
        <label className="casepick">
          <span>Case</span>
          <select id="case-select" value={ci} onChange={e => { start(); setShowRef(false); reset(Number(e.target.value)); }}>
            {CASES.map((k, i) => <option key={k.id} value={i}>{i + 1}. {k.title}</option>)}
          </select>
        </label>
      </header>

      <ol className="progress" aria-label="Steps">
        <li className={showIntro ? 'now ref' : 'ref'}>
          <button onClick={() => { setShowRef(false); setShowIntro(true); }} aria-pressed={showIntro}><span>?</span>About</button>
        </li>
        {STEPS.map((s, i) => {
          const here = !showRef && !showIntro && i === step;
          return (
            <li key={s} className={here ? 'now' : i <= maxStep ? 'done' : ''}>
              {i <= maxStep && started
                ? <button onClick={() => { setShowRef(false); setShowIntro(false); setStep(i); }} aria-current={here ? 'step' : undefined}><span>{i + 1}</span>{s}</button>
                : <div><span>{i + 1}</span>{s}</div>}
            </li>
          );
        })}
        <li className={showRef ? 'now ref' : 'ref'}>
          <button onClick={() => { setShowIntro(false); setShowRef(r => !r); }} aria-pressed={showRef}><span>i</span>Reference</button>
        </li>
      </ol>

      {showIntro && <Intro onStart={start} started={started} />}
      {showRef && !showIntro && <Reference onClose={() => setShowRef(false)} />}

      <div className="layout" hidden={showRef || showIntro}>
        <section className="panel" aria-live="polite">
          <div className="story">
            <div className="eyebrow">{caseLabel(ci)}</div>
            <h2>{c.title}</h2>
            <p>{c.story}</p>
            <p className="dx"><b>Diagnosis:</b> {c.dx}</p>
          </div>

          <dl className="chart" aria-label="Patient chart">
            <div><dt>Vital signs</dt><dd><span>{c.danger.circulation}</span></dd></div>
            <div><dt>Mental status</dt><dd><span>{c.danger.brain}</span></dd></div>
            {maxStep >= 1 && <div><dt>Exam</dt><dd>{c.exam.map(x => <span key={x}>{x}</span>)}</dd></div>}
            {maxStep >= 1 && c.tests && c.tests.length > 0 && <div><dt>Other tests</dt><dd>{c.tests.map(x => <span key={x}>{x}</span>)}</dd></div>}
            {maxStep >= 2 && <div><dt>Serum</dt><dd>
              <span className="v">Na⁺ {labNa} mEq/L</span>
              <span className="v">Glucose {labGlu} mg/dL</span>
              <span className="v">BUN {labBun} mg/dL</span>
              <span className="v">Hct {f0(L.hct)}%</span>
              {(osmChecked || maxStep > 2) && <span className="v">Osmolality {osmLab} mOsm/kg (measured)</span>}
            </dd></div>}
            {maxStep >= 4 && <div><dt>Urine</dt><dd>
              <span className="v">Osmolality {c.urine.osm} mOsm/kg</span>
              <span className="v">Na⁺ {c.urine.na} mEq/L</span>
              {c.urine.extra && <span>{c.urine.extra}</span>}
            </dd></div>}
          </dl>

          <div className="stepnav">
            {step > 0 && <button className="linkbtn" onClick={() => setStep(step - 1)}>← Back</button>}
            <span className="spacer" />
            {(maxStep > 0 || answered) && <button className="linkbtn" onClick={() => reset(ci)}>Restart case</button>}
          </div>
          {answered && maxStep > step && <p className="hint">Reviewing an earlier step. Only your first answer is scored.</p>}

          {step === 0 && (
            <div className="stepbox">
              <h3>1 · What is affected?</h3>
              <p className="lead">Use the vital signs and mental status above.</p>
              <p className="q">Which is affected?</p>
              <Choice label="What is affected" value={aff} disabled={aff != null}
                options={[{ v: 'circulation' as Danger, text: 'Circulation' }, { v: 'brain' as Danger, text: 'Brain' }, { v: 'both' as Danger, text: 'Both' }, { v: 'neither' as Danger, text: 'Neither' }]}
                onPick={v => { setAff(v); record({ aff: v === c.dangerKey || (c.dangerAlso ?? []).includes(v) }); }} />
              {aff != null && <>
                <Verdict ok={aff === c.dangerKey || (c.dangerAlso ?? []).includes(aff)}>{c.affectedNote}</Verdict>
                <p className="hint">Circulation depends mainly on ECF volume (the amount of sodium); the brain depends on cell volume (the sodium concentration). The next steps check each one.</p>
                <div className="row"><button className="primary" onClick={() => go(1)}>Next: ECF volume</button>{resetBtn(0)}</div>
              </>}
            </div>
          )}

          {step === 1 && (
            <div className="stepbox">
              <h3>2 · ECF volume</h3>
              <p className="lead">Use the exam: neck veins, mucous membranes, edema, weight, orthostatic change.</p>
              <p className="q">ECF volume is:</p>
              <Choice label="ECF volume" value={vol} disabled={vol != null}
                options={[{ v: 'dry' as Vol, text: 'Decreased' }, { v: 'euvolemic' as Vol, text: 'Normal' }, { v: 'wet' as Vol, text: 'Increased' }]}
                onPick={v => { setVol(v); setFlash(f => f + 1); record({ vol: v === c.volume || (c.volumeAlso ?? []).includes(v) }); }} />
              {vol != null && <>
                <Verdict ok={volOk}>{c.volumeNote}</Verdict>
                <p className="hint">The diagram now shows this patient’s ECF volume, {f1(truth.ecf)} L (dashed = normal, 14 L). Its height, the osmolality, comes next.</p>
                <div className="row"><button className="primary" onClick={() => go(2)}>Next: osmolality</button>{resetBtn(1)}</div>
              </>}
            </div>
          )}

          {step === 2 && (
            <div className="stepbox">
              <h3>3 · Serum osmolality</h3>
              <p className="lead">Na⁺ and glucose are the main ECF solutes. Calculate serum osmolality from the serum results above:</p>
              <p className="formula mono">2 × Na⁺ + glucose/18 + BUN/2.8</p>
              <details className="hintbox">
                <summary>Reference ranges</summary>
                <RefRanges />
              </details>
              <p className="q">Serum osmolality is:</p>
              <Choice label="Osmolality" value={osmGuess} disabled={osmChecked}
                options={[{ v: -1 as Snap, text: 'Low' }, { v: 0 as Snap, text: 'Normal' }, { v: 1 as Snap, text: 'High' }]}
                onPick={v => { setOsmGuess(v); setFlash(f => f + 1); }} />
              {!osmChecked && <>
                <p className="hint">Your answer is drawn as a dashed line on the diagram.</p>
                <button className="primary" disabled={osmGuess == null}
                  onClick={() => { setOsmChecked(true); record({ osm: osmGuess === osmDir }); }}>Check</button>
              </>}
              {osmChecked && <>
                <Verdict ok={osmGuess === osmDir}>
                  2 × {labNa} + {labGlu}/18 + {labBun}/2.8 = <b>{f0(calcOsm)} mOsm/kg</b>: {DIRWORD[osmDir]}. The measured value, now in the chart, matches.
                  {labGlu > 300 && <> Na⁺ is low, but glucose adds {f0(labGlu / 18)} mOsm/kg, so osmolality is high.</>}
                  {labGlu <= 300 && labNa < 135 && <> The low Na⁺ is what lowers it.</>}
                </Verdict>
                <p className="hint">The ECF is now drawn at the serum osmolality ({osmLab}). The cells are still drawn at their starting value ({cellsStart}).{labBun > 20 && <> That is above 285 because urea (BUN {labBun}) crosses cell membranes and adds the same amount to both sides.</>}</p>
                <div className="row"><button className="primary" onClick={() => go(3)}>Next: cells</button>{resetBtn(2)}</div>
              </>}
            </div>
          )}

          {step === 3 && (
            <div className="stepbox">
              <h3>4 · Cells</h3>
              <p className="lead">Serum (ECF) osmolality is {osmLab}; the cells start at {cellsStart} mOsm/kg.</p>
              <p className="q">Which side has the higher osmolality?</p>
              <Choice label="Higher osmolality" value={why} disabled={icfChecked}
                options={[{ v: -1 as Snap, text: 'ECF' }, { v: 1 as Snap, text: 'Cells' }, { v: 0 as Snap, text: 'Neither: equal' }]}
                onPick={setWhy} />
              <p className="q">So water moves:</p>
              <Choice label="Water movement" value={icfGuess} disabled={icfChecked}
                options={[{ v: 1 as Snap, text: 'Into cells (cells swell)' }, { v: 0 as Snap, text: 'No net movement' }, { v: -1 as Snap, text: 'Out of cells (cells shrink)' }]}
                onPick={v => { setIcfGuess(v); setFlash(f => f + 1); }} />
              {!icfChecked && <>
                <p className="hint">Your prediction is drawn as an arrow.</p>
                <button className="primary" disabled={icfGuess == null || why == null}
                  onClick={() => { setIcfChecked(true); record({ why: why === truthIcfDir, icf: icfGuess === truthIcfDir }); showShift('after'); }}>Check</button>
              </>}
              {icfChecked && <>
                <Verdict label="Higher osmolality" ok={why === truthIcfDir}>{truthIcfDir === 0
                  ? <>ECF and cells are both {osmLab}: no gradient.</>
                  : <>The {truthIcfDir > 0 ? 'cells' : 'ECF'} ({truthIcfDir > 0 ? cellsStart : osmLab}) {truthIcfDir > 0 ? 'were' : 'was'} higher than the {truthIcfDir > 0 ? 'ECF' : 'cells'} ({truthIcfDir > 0 ? osmLab : cellsStart}). Water moves toward the higher osmolality.</>}</Verdict>
                <Verdict label="Water" ok={icfGuess === truthIcfDir}>{c.icfNote} ICF {f1(truth.icf)} L (normal 28).</Verdict>
                <p className="brain"><b>Brain:</b> {c.brainNote}</p>
                <div className="shiftbox">
                  <div className="choices" role="group" aria-label="Water movement">
                    <button aria-pressed={shift === 'before'} onClick={() => showShift('before')}>1 · Before water moves</button>
                    <button aria-pressed={shift === 'after'} onClick={() => showShift('after')}>2 · Water moves</button>
                    <button className="linkbtn" onClick={playShift}>Replay</button>
                  </div>
                  <p className="hint">{shift === 'before'
                    ? <>Serum {osmLab}, cells {cellsStart}.{truthIcfDir === 0 ? ' No gradient, so no water moves.' : ` Water moves ${truthIcfDir > 0 ? 'into' : 'out of'} the cells.`}</>
                    : truthIcfDir === 0 ? <>Both sides stay at {osmLab}. ICF volume is unchanged.</>
                      : <>Water moved until the cells matched the serum ({osmLab}). Cells {truthIcfDir > 0 ? 'swelled' : 'shrank'} to {f1(truth.icf)} L (dashed = normal, 28 L).</>}</p>
                </div>
                <div className="row"><button className="primary" onClick={() => go(4)}>Next: kidney</button>{resetBtn(3)}</div>
              </>}
            </div>
          )}

          {step === 4 && (
            <div className="stepbox">
              <h3>5 · Kidney</h3>
              <p className="lead">Urine osmolality {c.urine.osm} mOsm/kg, urine Na⁺ {c.urine.na} mEq/L{c.urine.extra ? `, ${c.urine.extra.toLowerCase()}` : ''}.</p>
              <details className="hintbox">
                <summary>Reading the urine</summary>
                <UrineGuide />
              </details>
              <p className="q">Water: the kidney is</p>
              <Choice label="Water" value={water} disabled={kidneyChecked}
                options={[{ v: 'holding' as const, text: 'Retaining water' }, { v: 'dumping' as const, text: 'Excreting water' }]} onPick={setWater} />
              <p className="q">Salt: the kidney is</p>
              <Choice label="Salt" value={salt} disabled={kidneyChecked}
                options={[{ v: 'holding' as const, text: 'Retaining salt' }, { v: 'losing' as const, text: 'Excreting salt' }]} onPick={setSalt} />
              <p className="q">The kidney’s response is:</p>
              <Choice label="Kidney's response" value={role} disabled={kidneyChecked}
                options={[{ v: 'homeostatic' as const, text: 'Appropriate (homeostatic)' }, { v: 'problem' as const, text: 'Contributing to the problem' }]} onPick={setRole} />
              {!kidneyChecked && <button className="primary" disabled={water == null || salt == null || role == null}
                onClick={() => { setKidneyChecked(true); record({ water: water === c.water, salt: salt === c.salt, role: role === c.kidneyRole }); }}>Check</button>}
              {kidneyChecked && <>
                <Verdict label="Water" ok={water === c.water}>{c.waterNote}</Verdict>
                <Verdict label="Salt" ok={salt === c.salt}>{c.saltNote}</Verdict>
                <Verdict label="Response" ok={role === c.kidneyRole}>{c.roleNote}</Verdict>
                <div className="row"><button className="primary" onClick={() => go(5)}>Next: causal chain</button>{resetBtn(4)}</div>
              </>}
            </div>
          )}

          {step === 5 && (() => {
            const done = Object.keys({ ...history, [c.id]: result }).length;
            return (
              <div className="stepbox">
                <h3>6 · Causal chain</h3>
                <div className="chainbox">
                  <p className="q">Tap the links in order, from the cause to the bedside findings.</p>
                  {c.chain.some(Array.isArray) && <p className="hint">Slots with the same number happen at the same time; either order is accepted.</p>}
                  <ol className="chainlist">
                    {flat.map((slot, i) => {
                      const k = order[i];
                      const right = chainChecked && k != null && flat[k].pos === slot.pos;
                      const same = c.chain[slot.pos];
                      return <li key={i} value={slot.pos + 1} className={chainChecked ? (right ? 'right' : 'wrong') : k == null ? 'empty' : ''}>
                        {k == null ? ' ' : flat[k].text}
                        {chainChecked && !right && <span className="should">should be: {Array.isArray(same) ? same.join(' / ') : same}</span>}
                      </li>;
                    })}
                  </ol>
                  {!chainChecked && <div className="choices chainpool" role="group" aria-label="Links">
                    {pool.map(k => (
                      <button key={k} disabled={order.includes(k)} onClick={() => setOrder(o => [...o, k])}>{flat[k].text}</button>
                    ))}
                  </div>}
                  {!chainChecked && <div className="row">
                    <button className="primary" disabled={order.length < flat.length}
                      onClick={() => {
                        const ok = order.every((k, i) => flat[k].pos === flat[i].pos);
                        setChainChecked(true); record({ chain: ok });
                        setHistory(h => ({ ...h, [c.id]: { ...result, chain: result.chain ?? ok } }));
                      }}>Check</button>
                    <button className="linkbtn" disabled={!order.length} onClick={() => setOrder(o => o.slice(0, -1))}>Undo</button>
                    <button className="linkbtn" disabled={!order.length} onClick={() => setOrder([])}>Clear</button>
                  </div>}
                  {chainChecked && <Verdict ok={chainOk}>{chainOk ? 'Each link leads to the next.' : 'Compare with the corrected order: each link leads to the next.'}</Verdict>}
                  {chainChecked && <div className="row">{resetBtn(5)}</div>}
                </div>
                {chainChecked && <>
                  <div className="debrief">
                    <h3>Case summary: {c.title}</h3>
                    <dl>
                      <div><dt>Patient</dt><dd>{c.debrief.who}</dd></div>
                      <div><dt>Diagnosis</dt><dd>{c.dx}</dd></div>
                      <div><dt>What happened</dt><dd>{c.debrief.what}</dd></div>
                      <div><dt>Key findings</dt><dd>{c.debrief.findings}</dd></div>
                      <div><dt>Compartments</dt><dd>ECF volume {VOLWORD[c.volume]}; osmolality {DIRWORD[osmDir]}; ICF volume {truthIcfDir > 0 ? 'increased' : truthIcfDir < 0 ? 'decreased' : 'unchanged'}.</dd></div>
                      <div><dt>Affected</dt><dd>{c.debrief.affected}</dd></div>
                    </dl>
                    {LEARN[c.id] && <p className="hint">Learn more: <a href={LEARN[c.id].url} target="_blank" rel="noopener">{LEARN[c.id].text}</a> (MedlinePlus)</p>}
                  </div>
                  <div className="scorebig mono">{pts} / {SCORED.length}</div>
                  <ul className="tally">
                    {SCORED.map(([k, label]) => <li key={k} className={result[k] ? 'y' : result[k] === false ? 'n' : ''}>{label}</li>)}
                  </ul>
                  <p className="hint">{done} of {CORE} cases done.</p>
                  <div className="row">
                    {ci < CORE - 1 && <button className="primary" onClick={() => reset(ci + 1)}>Next case</button>}
                  </div>
                </>}
              </div>
            );
          })()}
        </section>

        <section className="figure" aria-label="Fluid compartment diagram">
          {flash > 0 && <div key={flash} className="flash" aria-hidden="true" />}
          <div className="diagwrap">
            {maxStep >= 2 && <div className="minilabs mono" aria-hidden="true">
              <span>Na⁺ {labNa}</span><span>Glu {labGlu}</span><span>BUN {labBun}</span>
              {(osmChecked || maxStep > 2) && <span>Osm {osmLab}</span>}
              {maxStep >= 4 && <><span>U<sub>osm</sub> {c.urine.osm}</span><span>U<sub>Na</sub> {c.urine.na}</span></>}
            </div>}
            {diag}
            <div className="legend">
              <span><i className="sw icf" />ICF (cells)</span>
              <span><i className="sw ecf" />ECF</span>
              <span><i className="sw normal" />normal</span>
            </div>
          </div>
        </section>
      </div>

      <footer>© 2026 Ian V. J. Murray · CC BY-NC-SA 4.0 · Teaching model: 42 L body water.</footer>
    </div>
  );
}
