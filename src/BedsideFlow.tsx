/*
 * Body Fluid Physiology: Volume and Osmolality
 * Copyright (c) 2026 Ian Victor Joseph Murray · CC BY-NC-SA 4.0
 * http://creativecommons.org/licenses/by-nc-sa/4.0/
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BASE, labs, run } from './engine';
import { CASES, Vol, Danger } from './cases';

const TITLE = 'Body Fluid Physiology';
const STEPS = ['What is affected', 'ECF volume', 'Osmolality', 'Cells', 'Kidney', 'Summary'];
const NORMAL = 290;                         // serum osmolality, mOsm/kg
const OSM_LO = 275, OSM_HI = 295;           // reference range
const DIRWORD: Record<-1 | 0 | 1, string> = { [-1]: 'low', 0: 'normal', 1: 'high' };
const VOLWORD: Record<Vol, string> = { dry: 'decreased', euvolemic: 'normal', wet: 'increased' };
const CORE = CASES.length;
const caseLabel = (i: number) => `Case ${i + 1} of ${CORE}`;
const OSM_SNAPS: Record<-1 | 0 | 1, number> = { [-1]: 230, 0: NORMAL, 1: 350 };

type Snap = -1 | 0 | 1;
type Result = { aff?: boolean; vol?: boolean; osm?: boolean; icf?: boolean; water?: boolean; salt?: boolean; role?: boolean };
const SCORED: [keyof Result, string][] = [
  ['aff', 'What is affected'], ['vol', 'ECF volume'], ['osm', 'Osmolality'], ['icf', 'Cells: water movement'],
  ['water', 'Kidney: water'], ['salt', 'Kidney: salt'], ['role', 'Kidney: response'],
];

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
  focus?: Focus;                     // the part of the diagram the current step is about
  ghost?: Ghost;                     // faint, tappable outlines for the answer options
};
type Focus = 'labels' | 'width' | 'height' | 'membrane' | 'dim';
// Answer options drawn on the diagram. width: ECF litres; height: osmolality; arrow: 1 in, 0 none, -1 out.
type Ghost = { kind: 'width' | 'height' | 'arrow'; options: { v: any; label: string; at: number }[]; chosen?: any; onPick?: (v: any) => void };

function Diagram({ ecf, icf, osm, ecfOsm, showOsm, lines = [], preEcf, arrow, arrowGuess, max = 380, focus, ghost }: DiagramProps) {
  const W = 600, H = 320, PX = 9, left = 52, mem = left + 36 * PX, top = 24, bottom = 262, MAX = max;
  const y = (o: number) => bottom - (Math.min(o, MAX) / MAX) * (bottom - top);
  const icfY = y(osm);
  const ecfY = y(ecfOsm ?? osm);
  const box = (x: number, yy: number, w: number, h: number) =>
    ({ x, y: yy, width: w, height: h, style: { x, y: yy, width: w, height: h } as React.CSSProperties });
  const lowY = Math.max(icfY, ecfY);
  const ay = lowY + (bottom - lowY) * 0.42;
  const word = arrowGuess ? 'your prediction: ' : '';
  const ecfW = (ecf ?? BASE.ecf) * PX;         // width used for focus marks and height outlines
  const pick = (v: any) => ghost?.onPick && ghost.onPick(v);
  const shown = ghost ? (ghost.onPick ? ghost.options : ghost.options.filter(o => o.v === ghost.chosen)) : [];
  const tag = (o: { v: any; label: string }) => (!ghost?.onPick ? `your answer: ${o.label}` : o.label);
  const cls = (o: { v: any }) => `ghost${o.v === ghost?.chosen ? ' chosen' : ''}`;
  const tapProps = (o: { v: any; label: string }) => ghost?.onPick ? {
    className: 'pickable', role: 'button', tabIndex: 0, 'aria-label': o.label, onClick: () => pick(o.v),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(o.v); } },
  } : {};
  // Option labels are yellow pills: yellow means "tap here". The chosen one turns solid; the others fade.
  const pill = (o: { v: any; label: string }, x: number, cy: number, anchor: 'start' | 'middle' | 'end') => {
    const text = tag(o), w = text.length * 8.4 + 22, h = 26;
    const raw = anchor === 'middle' ? x : anchor === 'start' ? x + w / 2 - 10 : x - w / 2 + 4;
    const cx = Math.min(W - 4 - w / 2, Math.max(left + w / 2, raw));   // keep the pill inside the diagram
    const chosen = o.v === ghost?.chosen, picking = !!ghost?.onPick;
    const state = chosen ? ' chosen' : picking && ghost?.chosen != null ? ' faded' : '';
    return (
      <g className={`pill${state}${picking && ghost?.chosen == null ? ' pulse' : ''}`}>
        <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2} />
        <text x={cx} y={cy + 5} textAnchor="middle">{text}</text>
      </g>
    );
  };
  const byY = ghost?.kind === 'height' ? [...ghost.options].sort((a, b) => b.at - a.at) : [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`dy-svg${focus === 'dim' ? ' dimmed' : ''}`} role="img"
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
      <text x={left + 6} y={y(NORMAL) - 6} className="reftext">normal {NORMAL}</text>

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

      <defs>
        <marker id="fh" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="focushead" /></marker>
      </defs>

      {ghost?.kind === 'width' && (() => {
        const asc = [...ghost.options].sort((p, q) => p.at - q.at);
        return shown.map(o => {
          const k = asc.findIndex(p => p.v === o.v);
          const x0 = mem + (k === 0 ? 0 : (asc[k - 1].at + o.at) / 2 * PX);
          const x1 = k === asc.length - 1 ? W - 12 : mem + (asc[k + 1].at + o.at) / 2 * PX;
          const lx = ghost.onPick ? (x0 + x1) / 2 : mem + o.at * PX - 4;
          return (
            <g key={String(o.v)} {...tapProps(o)}>
              {ghost.onPick && <rect x={x0} y={top - 8} width={x1 - x0} height={bottom - top + 8} className="hit" />}
              <rect x={mem} y={ecfY} width={o.at * PX} height={bottom - ecfY} className={cls(o)} />
              {pill(o, lx, ecfY + 24 + (ghost.onPick && k === 1 ? 30 : 0), ghost.onPick ? 'middle' : 'end')}
            </g>
          );
        });
      })()}
      {ghost?.kind === 'height' && shown.map(o => {
        const k = byY.findIndex(b => b.v === o.v);
        const yy = y(o.at), up = k > 0 ? y(byY[k - 1].at) : yy - 24, dn = k < byY.length - 1 ? y(byY[k + 1].at) : yy + 24;
        return (
          <g key={String(o.v)} {...tapProps(o)}>
            {ghost.onPick && (() => { const t0 = k === 0 ? top - 8 : (yy + up) / 2, b0 = k === byY.length - 1 ? bottom : (yy + dn) / 2; return <rect x={mem} y={t0} width={W - 12 - mem} height={b0 - t0} className="hit" />; })()}
            <line x1={mem} x2={mem + ecfW} y1={yy} y2={yy} className={cls(o)} />
            {pill(o, mem + ecfW + 34, yy, 'start')}
          </g>
        );
      })}
      {ghost?.kind === 'arrow' && shown.map(o => {
        const yy = ay + (ghost.onPick ? -o.at * 40 : 0);
        return (
          <g key={String(o.v)} {...tapProps(o)}>
            {ghost.onPick && <rect x={left} y={yy - 20} width={W - 12 - left} height={40} className="hit" />}
            {o.at !== 0 && <line x1={mem + o.at * 50} x2={mem - o.at * 44} y1={yy} y2={yy} className={cls(o)} markerEnd="url(#fh)" />}
            {pill(o, o.at === 0 ? mem : mem + 88, yy, o.at === 0 ? 'middle' : 'start')}
          </g>
        );
      })}

      {focus === 'labels' && <>
        <text x={mem - (BASE.icf * PX) / 2} y={top + 16} textAnchor="middle" className="focuslab">brain (cells)</text>
        <text x={mem + (BASE.ecf * PX) / 2} y={top + 16} textAnchor="middle" className="focuslab">circulation (ECF)</text>
      </>}
      {focus === 'width' && <>
        <line x1={mem + 3} x2={mem + ecfW - 3} y1={top + 10} y2={top + 10} className="focusmark" markerStart="url(#fh)" markerEnd="url(#fh)" />
        <text x={mem + ecfW + 8} y={top + 14} className="focuslab">width = volume</text>
      </>}
      {focus === 'height' && <>
        <line x1={mem + ecfW + 14} x2={mem + ecfW + 14} y1={bottom - 3} y2={ecfY + 3} className="focusmark" markerStart="url(#fh)" markerEnd="url(#fh)" />
        <text x={left + 8} y={top + 14} className="focuslab">height = osmolality</text>
      </>}

      <line x1={mem} x2={mem} y1={top - 8} y2={bottom} className={`membrane${focus === 'membrane' ? ' focus' : ''}`} />
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
      {ecf == null && !ghost && <text x={mem + 12} y={(top + bottom) / 2 + 30} className="tick">ECF: judged in step 2</text>}

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
      <tr><td>Urine glucose present (e.g., 4+)</td><td>Excreting water: glucose holds water in the tubule (osmotic diuresis), so a high U<sub>osm</sub> does not mean ADH is acting</td></tr>
      <tr><td>U<sub>osm</sub> ≤ 100 mOsm/kg</td><td>Excreting water: maximally dilute urine (ADH suppressed or not acting)</td></tr>
      <tr><td>U<sub>osm</sub> &gt; 100 mOsm/kg</td><td>Retaining water: ADH is acting</td></tr>
      <tr><td>U<sub>Na</sub> ≤ 30 mEq/L</td><td>Retaining salt: the kidney senses low effective volume</td></tr>
      <tr><td>U<sub>Na</sub> &gt; 30 mEq/L</td><td>Excreting salt (normal volume, diuretics, or renal salt loss)</td></tr>
    </tbody></table>
    <p className="hint">Check for urine glucose first. Cutoffs from Spasovski et al., 2014.</p>
  </>
);

// ---------- Opening screen ----------
function Intro({ onStart, started }: { onStart: () => void; started: boolean }) {
  return (
    <section className="panel intro" aria-label="About this activity">
      <h2>What this activity is for</h2>
      <p>Serum sodium answers two different questions. The <b>amount</b> of sodium in the body sets <b>ECF volume</b>, which you judge from the vital signs and the exam; it tells you whether the <b>circulation</b> is affected. The sodium <b>concentration</b> (with glucose) sets <b>serum osmolality</b>, which decides whether water moves into or out of <b>cells</b>; brain cells show it first.</p>
      <p>Each case starts where a clinician starts: from the vital signs and mental status, is the <b>circulation</b>, the <b>brain</b>, both or neither affected? The rest of the case works out why.</p>
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
        <li><b>Case summary</b>: what happened, and the findings that showed it.</li>
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
        <li>Urea crosses cell membranes, so it raises osmolality on both sides equally and does not move water. BUN is raised in case 4.</li>
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
  const [icfGuess, setIcfGuess] = useState<Snap>();
  const [icfChecked, setIcfChecked] = useState(false);
  const [water, setWater] = useState<'holding' | 'dumping'>();
  const [salt, setSalt] = useState<'holding' | 'losing'>();
  const [role, setRole] = useState<'homeostatic' | 'problem'>();
  const [kidneyChecked, setKidneyChecked] = useState(false);
  const [result, setResult] = useState<Result>({});
  const [flash, setFlash] = useState(0);
  const [history, setHistory] = useState<Record<string, Result>>({});
  const [showRef, setShowRef] = useState(false);
  const [shift, setShift] = useState<'before' | 'after'>('after');   // cells step: before or after water moves
  const timer = useRef<number>();
  // On narrow screens the diagram is pinned at the top; once it is pinned, it shrinks and hides its keys.
  const diagRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const el = diagRef.current;
      if (!el || window.innerWidth > 820) { setPinned(false); return; }
      const y = window.scrollY, atTop = el.getBoundingClientRect().top <= 1;
      // Hysteresis: pin past 120 px, unpin only near the top, so the size change cannot make it flicker.
      setPinned(prev => (prev ? y > 20 : atTop && y > 120));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
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
  const cellsStart = NORMAL;   // cells start at normal; water has not moved yet
  const scaleMax = 380;

  const reset = (i: number) => {
    setCi(i); setStep(0); setMaxStep(0); setAff(undefined); setVol(undefined); setOsmGuess(undefined); setOsmChecked(false);
    setIcfGuess(undefined); setIcfChecked(false); setWater(undefined); setSalt(undefined); setRole(undefined); setKidneyChecked(false);
    setResult({}); showShift('after');
  };

  const volOk = vol != null && (vol === c.volume || (c.volumeAlso ?? []).includes(vol));

  // What the diagram shows. Every value is the patient's own: ECF volume as examined, serum osmolality as measured.
  // The cells start at normal; in the Cells step water moves until they match the serum.
  const examEcf = { ecf: truth.ecf, icf: BASE.icf, osm: cellsStart };
  const gradient = { ...examEcf, ecfOsm: osmLab };
  const final = { ecf: truth.ecf, icf: truth.icf, osm: osmLab };
  const osmLine: Line = { v: osmLab, text: `Serum osmolality ${osmLab}`, kind: 'truth' };
  const guessLine = (g: Snap | undefined): Line[] => g != null ? [{ v: OSM_SNAPS[g], text: 'your answer', kind: 'pred' }] : [];
  // Chart rows the current step uses are highlighted; the others are dimmed.
  const ROWS: Record<number, string[]> = { 0: ['vitals', 'mental'], 1: ['exam', 'tests'], 2: ['serum'], 4: ['urine'] };
  const rowCls = (k: string) => { const on = ROWS[step]; return on ? (on.includes(k) ? 'hl' : 'dim') : undefined; };
  // The same handlers serve the panel buttons and the outlines on the diagram.
  const pickVol = (v: Vol) => { if (vol != null) return; setVol(v); setFlash(f => f + 1); record({ vol: v === c.volume || (c.volumeAlso ?? []).includes(v) }); };
  const pickOsm = (v: Snap) => { if (osmChecked) return; setOsmGuess(v); setFlash(f => f + 1); };
  const pickIcf = (v: Snap) => { if (icfChecked) return; setIcfGuess(v); setFlash(f => f + 1); };
  const VOL_OPTS = [{ v: 'dry' as Vol, label: 'decreased', at: 8 }, { v: 'euvolemic' as Vol, label: 'normal', at: BASE.ecf }, { v: 'wet' as Vol, label: 'increased', at: 20 }];
  const OSM_OPTS = [{ v: -1 as Snap, label: 'low', at: OSM_SNAPS[-1] }, { v: 0 as Snap, label: 'normal', at: OSM_SNAPS[0] }, { v: 1 as Snap, label: 'high', at: OSM_SNAPS[1] }];
  const ICF_OPTS = [{ v: 1 as Snap, label: 'water into cells', at: 1 }, { v: 0 as Snap, label: 'no movement', at: 0 }, { v: -1 as Snap, label: 'water out of cells', at: -1 }];
  let diag: React.ReactNode;
  if (step === 0) diag = <Diagram max={scaleMax} ecf={null} icf={BASE.icf} osm={cellsStart} focus="labels" />;
  else if (step === 1 && vol == null)
    diag = <Diagram max={scaleMax} ecf={null} icf={BASE.icf} osm={cellsStart} focus="width" ghost={{ kind: 'width', options: VOL_OPTS, onPick: pickVol }} />;
  else if (step === 1) diag = <Diagram max={scaleMax} {...examEcf} focus="width" ghost={{ kind: 'width', options: VOL_OPTS, chosen: vol }} />;
  else if (step === 2 && !osmChecked)
    diag = <Diagram max={scaleMax} {...examEcf} focus="height" ghost={{ kind: 'height', options: OSM_OPTS, chosen: osmGuess, onPick: pickOsm }} />;
  else if (step === 2) diag = <Diagram max={scaleMax} {...gradient} showOsm focus="height" lines={[osmLine, ...(osmGuess != null && osmGuess !== osmDir ? guessLine(osmGuess).map(l => ({ ...l, kind: 'wrong' as const })) : [])]} />;
  else if (step === 3 && !icfChecked)
    diag = <Diagram max={scaleMax} {...gradient} showOsm focus="membrane" ghost={{ kind: 'arrow', options: ICF_OPTS, chosen: icfGuess, onPick: pickIcf }} />;
  else if (step === 3) diag = <Diagram max={scaleMax} {...final} showOsm focus="membrane" arrow={truthIcfDir} />;
  else diag = <Diagram max={scaleMax} {...final} showOsm focus={step === 4 ? 'dim' : undefined} />;

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
    if (n === 3) { setIcfGuess(undefined); setIcfChecked(false); showShift('after'); }
    if (n === 4) { setWater(undefined); setSalt(undefined); setRole(undefined); setKidneyChecked(false); }
  };
  const resetBtn = (n: number) => (
    <button className="linkbtn" onClick={() => redo(n)} title="Clear your answer to this step and try again. Your first answer is still the one scored.">Reset this step</button>
  );
  const answered = [aff != null, vol != null, osmChecked, icfChecked, kidneyChecked, true][step] ?? false;
  const pts = SCORED.filter(([k]) => result[k] === true).length;

  const start = () => { setShowIntro(false); setStarted(true); };

  return (
    <div className="dy">
      <header className="top">
        <div>
          <div className="eyebrow">Volume and osmolality · four patient cases</div>
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
            <div className={rowCls('vitals')}><dt>Vital signs</dt><dd><span>{c.danger.circulation}</span></dd></div>
            <div className={rowCls('mental')}><dt>Mental status</dt><dd><span>{c.danger.brain}</span></dd></div>
            {maxStep >= 1 && <div className={rowCls('exam')}><dt>Exam</dt><dd>{c.exam.map(x => <span key={x}>{x}</span>)}</dd></div>}
            {maxStep >= 1 && c.tests && c.tests.length > 0 && <div className={rowCls('tests')}><dt>Other tests</dt><dd>{c.tests.map(x => <span key={x}>{x}</span>)}</dd></div>}
            {maxStep >= 2 && <div className={rowCls('serum')}><dt>Serum</dt><dd>
              <span className="v">Na⁺ {labNa} mEq/L</span>
              <span className="v">Glucose {labGlu} mg/dL</span>
              <span className="v">BUN {labBun} mg/dL</span>
              <span className="v">Hct {f0(L.hct)}%</span>
              {(osmChecked || maxStep > 2) && <span className="v">Osmolality {osmLab} mOsm/kg (measured)</span>}
            </dd></div>}
            {maxStep >= 4 && <div className={rowCls('urine')}><dt>Urine</dt><dd>
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
                <p className="hint">Circulation depends mainly on ECF volume (the amount of sodium); the brain depends on cell volume (osmolality, set mainly by the sodium concentration). The next steps check each one.</p>
                <div className="row"><button className="primary" onClick={() => go(1)}>Next: ECF volume</button>{resetBtn(0)}</div>
              </>}
            </div>
          )}

          {step === 1 && (
            <div className="stepbox">
              <h3>2 · ECF volume</h3>
              <p className="lead">Use the exam: neck veins, mucous membranes, edema, weight, orthostatic change.</p>
              <p className="q">ECF volume is:</p>
              {vol == null && <p className="hint tapcue">Tap an outline on the diagram: decreased, normal or increased.</p>}
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
                <summary>Show reference values</summary>
                <RefRanges />
              </details>
              <p className="q">Serum osmolality is:</p>
              {!osmChecked && <>
                <p className="hint tapcue">Tap a line on the diagram: low, normal or high. Then Check.</p>
                <button className="primary" disabled={osmGuess == null}
                  onClick={() => { setOsmChecked(true); record({ osm: osmGuess === osmDir }); }}>Check</button>
              </>}
              {osmChecked && <>
                <Verdict ok={osmGuess === osmDir}>
                  2 × {labNa} + {labGlu}/18 + {labBun}/2.8 = <b>{f0(calcOsm)} mOsm/kg</b>: {DIRWORD[osmDir]}. The measured serum osmolality, now in the chart, is also {osmLab}.
                  {labGlu > 300 && <> Na⁺ is low, but glucose adds {f0(labGlu / 18)} mOsm/kg, so osmolality is high.</>}
                  {labGlu <= 300 && labNa < 135 && <> The low Na⁺ is what lowers it.</>}
                </Verdict>
                <p className="hint">The ECF is now drawn at the serum osmolality ({osmLab}). The cells are still at normal ({cellsStart}): water has not moved yet. That is the next step.</p>
                <div className="row"><button className="primary" onClick={() => go(3)}>Next: cells</button>{resetBtn(2)}</div>
              </>}
            </div>
          )}

          {step === 3 && (
            <div className="stepbox">
              <h3>4 · Cells</h3>
              <p className="lead">Serum (ECF) osmolality is {osmLab}; the cells are still at normal ({cellsStart}).</p>
              <p className="q">Which way does water move?</p>
              {!icfChecked && <>
                <p className="hint tapcue">Tap an arrow on the diagram: into cells, no movement, or out of cells. Then Check.</p>
                <button className="primary" disabled={icfGuess == null}
                  onClick={() => { setIcfChecked(true); record({ icf: icfGuess === truthIcfDir }); showShift('after'); }}>Check</button>
              </>}
              {icfChecked && <>
                <Verdict label="Water" ok={icfGuess === truthIcfDir}>{truthIcfDir !== 0 && <>Water moves toward the higher osmolality. </>}{c.icfNote} ICF {f1(truth.icf)} L (normal 28).</Verdict>
                <p className="brain"><b>Brain:</b> {c.brainNote}</p>
                <p className="hint">{truthIcfDir === 0 ? 'No gradient, so no water moved.' : 'On the diagram, the dashed outline is the cells before water moved; the pink block is after.'}</p>
                <div className="row"><button className="primary" onClick={() => go(4)}>Next: kidney</button>{resetBtn(3)}</div>
              </>}
            </div>
          )}

          {step === 4 && (
            <div className="stepbox">
              <h3>5 · Kidney</h3>
              <p className="lead">Urine osmolality {c.urine.osm} mOsm/kg, urine Na⁺ {c.urine.na} mEq/L{c.urine.extra ? `, ${c.urine.extra.toLowerCase()}` : ''}.</p>
              <details className="hintbox">
                <summary>Show how to read the urine</summary>
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
                <div className="row"><button className="primary" onClick={() => { go(5); setHistory(h => ({ ...h, [c.id]: result })); }}>Next: case summary</button>{resetBtn(4)}</div>
              </>}
            </div>
          )}

          {step === 5 && (() => {
            const done = Object.keys({ ...history, [c.id]: result }).length;
            return (
              <div className="stepbox">
                <>
                  <div className="debrief">
                    <h3>6 · Case summary: {c.title}</h3>
                    <dl>
                      <div><dt>Patient</dt><dd>{c.debrief.who}</dd></div>
                      <div><dt>Diagnosis</dt><dd>{c.dx}</dd></div>
                      <div><dt>What happened</dt><dd>{c.debrief.what}</dd></div>
                      <div><dt>Key findings</dt><dd>{c.debrief.findings}</dd></div>
                      <div><dt>On the diagram</dt><dd className="ondiagram">{(() => {
                        // Read the final picture: what you see → what it means → what it affects.
                        const dE = truth.ecf - BASE.ecf, dI = truth.icf - BASE.icf;
                        const circ = c.dangerKey === 'circulation' || c.dangerKey === 'both';
                        const size = (d: number, more: string, less: string) => Math.abs(d) < 1.5 ? (Math.abs(d) < 0.1 ? 'the same as' : `close to`) : d > 0 ? more : less;
                        return <>
                          <span><b>Width:</b> ECF {size(dE, 'wider than', 'narrower than')} the dashed normal ({f1(truth.ecf)} L vs 14) → ECF volume {VOLWORD[c.volume]} → circulation {circ ? 'affected' : 'not affected'}.</span>
                          <span><b>Height:</b> {osmDir === 0 ? 'at' : osmDir > 0 ? 'above' : 'below'} the normal line ({osmLab} vs 290) → osmolality {DIRWORD[osmDir]} → {truthIcfDir > 0 ? 'water moved into the cells' : truthIcfDir < 0 ? 'water moved out of the cells' : 'no water moved'}.</span>
                          <span><b>ICF (cells):</b> {Math.abs(dI) < 0.1 ? 'the same size as' : `${Math.abs(dI) < 1.5 ? 'slightly ' : ''}${dI > 0 ? 'larger' : 'smaller'} than`} the dashed normal ({f1(truth.icf)} L vs 28) → ICF volume {truthIcfDir > 0 ? 'increased' : truthIcfDir < 0 ? 'decreased' : 'unchanged'} → brain {c.brainShort}.</span>
                        </>;
                      })()}</dd></div>
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
                </>
              </div>
            );
          })()}
        </section>

        <section className="figure" aria-label="Fluid compartment diagram">
          {flash > 0 && <div key={flash} className="flash" aria-hidden="true" />}
          <div className={`diagwrap${pinned ? ' pinned' : ''}`} ref={diagRef}>
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
            <p className="diagkey">Width = volume (circulation) · Height = osmolality (cells, brain) · Water moves until the heights match</p>
          </div>
        </section>
      </div>

      <footer>© 2026 Ian V. J. Murray · CC BY-NC-SA 4.0 · Teaching model: 42 L body water.</footer>
    </div>
  );
}
