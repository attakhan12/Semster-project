// frontend/src/pages/hall.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import Sidebar from "./sidebar";
import "../datesheet.css";
import "../hall.css";

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

/* ─────────────────────── types ─────────────────────── */
type Kind = "lecture" | "section";
type RowPolicy = "interleave" | "even-odd" | "block";

interface Hall {
  id: number;
  name: string;
  building: string;
  kind: Kind;
  capacity: number;
  papers: number;
  config?: HallConfig;
}

interface HallConfig {
  exam_name?: string;
  exam_subject?: string;
  semester_sections?: SemesterSection[];
  row_policy?: RowPolicy;
}

interface SemesterSection {
  semester: number;
  batch: string;
  sections: string[];
  roll_from: number;
  roll_to: number;
  row_pref?: "even" | "odd" | "any";
}

interface Invigilator { id: number; name: string; department: string; designation: string }
interface Seat { roll: string; section: string }
interface Seating {
  date: string;
  hall: Hall;
  rows: (Seat | null)[][];
  students: number;
  required_invigilators: number;
  invigilators: Invigilator[];
  sections: string[];
  exam_name: string;
  exam_subject: string;
}

interface Catalogue {
  semesters: number[];
  sections: string[];
  batches: Record<string, string>;
  subjects: Record<string, { code: string; title: string; credits: string }[]>;
}

/* ─────────────────────── API helpers ─────────────────────── */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api/halls${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ─────────────────────── seating builder ─────────────────────── */
function buildSeatingRows(semSections: SemesterSection[], capacity: number): Seat[][] {
  const ROW_SIZE = 10;
  const numRows = Math.ceil(capacity / ROW_SIZE);
  // build student list per section group ordered by roll
  const groups: Array<{ label: string; seats: Seat[]; pref: "even" | "odd" | "any" }> = [];
  for (const ss of semSections) {
    const seats: Seat[] = [];
    for (let n = ss.roll_from; n <= ss.roll_to; n++) {
      const roll = `${ss.batch}-${String(n).padStart(3, "0")}`;
      const sectionLabel = `${ss.semester}${ss.sections.join("/")}`;
      seats.push({ roll, section: sectionLabel });
    }
    groups.push({ label: `${ss.semester}${ss.sections.join("/")}`, seats, pref: ss.row_pref ?? "any" });
  }

  if (groups.length === 0) return Array.from({ length: numRows }, () => Array(ROW_SIZE).fill(null));

  const rows: Seat[][] = Array.from({ length: numRows }, () => []);

  if (groups.length === 1 || groups.every(g => g.pref === "any")) {
    // interleave all students row by row
    let gi = 0;
    let si = 0;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < ROW_SIZE; c++) {
        if (gi >= groups.length) { rows[r].push(null as unknown as Seat); continue; }
        if (si >= groups[gi].seats.length) { gi++; si = 0; }
        if (gi >= groups.length) { rows[r].push(null as unknown as Seat); continue; }
        rows[r].push(groups[gi].seats[si++]);
      }
    }
    return rows;
  }

  // even/odd row policy
  const evenGroups = groups.filter(g => g.pref === "even");
  const oddGroups  = groups.filter(g => g.pref === "odd");
  const anyGroups  = groups.filter(g => g.pref === "any");

  const evenSeats = [...evenGroups, ...anyGroups.slice(0, 1)].flatMap(g => g.seats);
  const oddSeats  = [...oddGroups,  ...anyGroups.slice(1)].flatMap(g => g.seats);

  let ei = 0, oi = 0;
  for (let r = 0; r < numRows; r++) {
    const isEven = r % 2 === 0;
    const pool = isEven ? evenSeats : oddSeats;
    let idx = isEven ? ei : oi;
    for (let c = 0; c < ROW_SIZE; c++) {
      rows[r].push(idx < pool.length ? pool[idx++] : null as unknown as Seat);
    }
    if (isEven) ei = idx; else oi = idx;
  }
  return rows;
}

/* ─────────────────────── tiny icons ─────────────────────── */
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const I = {
  plus: "M12 5v14M5 12h14",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  building: "M3 21h18M6 21V4h8v17M14 9h4v12M9 8h2M9 12h2M9 16h2",
  close: "M18 6L6 18M6 6l12 12",
  shuffle: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  check: "M20 6L9 17l-5-5",
  info: "M12 16v-4M12 8h.01M12 2a10 10 0 100 20A10 10 0 0012 2z",
};

/* ─────────────────────── section colours ─────────────────────── */
const PALETTE = 8;
const sectionClass = (sections: string[], s: string) => `hl-sec-${Math.max(0, sections.indexOf(s)) % PALETTE}`;

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function HallsPage() {
  const [halls, setHalls]     = useState<Hall[]>([]);
  const [filter, setFilter]   = useState<"all" | Kind>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [editing, setEditing] = useState<Hall | "new" | null>(null);
  const [open, setOpen]       = useState<Hall | null>(null);

  const load = useCallback(async () => {
    try {
      setHalls(await api<Hall[]>(""));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown     = useMemo(() => halls.filter(h => filter === "all" || h.kind === filter), [halls, filter]);
  const seats     = shown.reduce((a, h) => a + h.capacity, 0);
  const maxPapers = Math.max(1, ...halls.map(h => h.papers));

  async function remove(h: Hall) {
    if (!confirm(`Delete "${h.name}"? This cannot be undone.`)) return;
    try { await api(`/${h.id}`, { method: "DELETE" }); load(); }
    catch (e) { alert((e as Error).message); }
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main-content">
        {/* top bar */}
        <div className="top-bar">
          <span>Phase 1 · Examination Halls &amp; Seating</span>
          <span className="api-status">Python API online</span>
        </div>

        <div className="hl-page">
          {/* toolbar strip */}
          <div className="datesheet-toolbar" style={{ margin: "0 0 16px" }}>
            <span className="datesheet-pill">ETIS / EXAMINATION CELL</span>
            <button className="hl-btn hl-btn-primary" onClick={() => setEditing("new")}>
              <Icon d={I.plus} size={15} /> Add Hall
            </button>
          </div>

          {/* page header */}
          <section className="official-heading" style={{ marginBottom: 22, textAlign: "left", padding: "20px 24px" }}>
            <p className="datesheet-eyebrow">DEPARTMENT OF SOFTWARE ENGINEERING</p>
            <h1 style={{ margin: "4px 0 6px", fontSize: 28, color: "#174b3d" }}>
              Lecture Halls &amp; Examination Rooms
            </h1>
            <p style={{ margin: 0, color: "#686158", fontSize: 14 }}>
              Foundation University Islamabad · Capacity, section allocation, roll-number seating, and invigilator duties
            </p>
          </section>

          {/* filter tabs */}
          <div className="hl-toolbar">
            <div className="hl-tabs">
              {([["all", "All Halls"], ["lecture", "Lecture Halls"], ["section", "Section Rooms"]] as const).map(([k, l]) => (
                <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
            <span className="hl-count">{shown.length} rooms · {seats} total seats</span>
          </div>

          {error  && <div className="hl-error">Could not reach the server: {error}</div>}
          {loading && <div className="hl-muted hl-pad">Loading halls…</div>}

          {/* hall cards */}
          <div className="hl-grid">
            {shown.map(h => (
              <article key={h.id} className="hl-card" onClick={() => setOpen(h)} tabIndex={0}
                       onKeyDown={e => e.key === "Enter" && setOpen(h)}>
                <div className="hl-card-top">
                  <span className="hl-icon"><Icon d={I.building} size={22} /></span>
                  <div className="hl-card-name">
                    <h3>{h.name}</h3>
                    <span>{h.building}</span>
                  </div>
                  <div className="hl-actions" onClick={e => e.stopPropagation()}>
                    <button className="hl-icon-btn" title="Edit" onClick={() => setEditing(h)}><Icon d={I.edit} /></button>
                    <button className="hl-icon-btn" title="Delete" onClick={() => remove(h)}><Icon d={I.trash} /></button>
                  </div>
                </div>
                <div className="hl-card-mid">
                  <span className="hl-pill">{h.kind === "lecture" ? "Lecture Hall" : "Section Room"}</span>
                  <span className="hl-seats"><Icon d={I.users} /> {h.capacity} seats</span>
                </div>
                <div className="hl-bar"><i style={{ width: `${(h.papers / maxPapers) * 100}%` }} /></div>
                <span className="hl-used">Used in {h.papers} exam sessions</span>
              </article>
            ))}
          </div>

          {/* modals */}
          {editing && (
            <HallForm
              hall={editing === "new" ? null : editing}
              onClose={() => setEditing(null)}
              onSaved={() => { setEditing(null); load(); }}
            />
          )}
          {open && <SeatingModal hall={open} onClose={() => { setOpen(null); load(); }} />}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MODAL SHELL
═══════════════════════════════════════════════════════════════ */
function Modal({ title, onClose, children, wide, extraWide }: {
  title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean; extraWide?: boolean;
}) {
  const openedAt = useRef(Date.now());
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);

  return createPortal(
    <div className="hl-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget && Date.now() - openedAt.current > 400) onClose();
      }}>
      <div className={`hl-modal ${wide ? "wide" : ""} ${extraWide ? "extra-wide" : ""}`} role="dialog" aria-modal>
        <header>
          <h2>{title}</h2>
          <button className="hl-icon-btn" onClick={onClose} aria-label="Close"><Icon d={I.close} size={18} /></button>
        </header>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADD / EDIT HALL — FULL FORM
═══════════════════════════════════════════════════════════════ */
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTION_LETTERS = ["A", "B", "C"];
const DEFAULT_BATCHES: Record<number, string> = {
  1: "F24-BSSE", 2: "SP24-BSSE", 3: "F23-BSSE", 4: "SP23-BSSE",
  5: "F22-BSSE", 6: "SP22-BSSE", 7: "F21-BSSE", 8: "SP21-BSSE",
};
const EXAM_TYPES = ["Final Term Exam", "Mid Term Exam"];

function HallForm({ hall, onClose, onSaved }: { hall: Hall | null; onClose: () => void; onSaved: () => void }) {
  const existingCfg = hall?.config ?? {};

  /* ── basic ── */
  const [name,     setName]     = useState(hall?.name     ?? "");
  const [building, setBuilding] = useState(hall?.building ?? "");
  const [kind,     setKind]     = useState<Kind>(hall?.kind ?? "lecture");
  const [capacity, setCapacity] = useState(hall?.capacity ?? 60);
  const [date,     setDate]     = useState(today());

  /* ── exam ── */
  const [examType,    setExamType]    = useState(existingCfg.exam_name    ?? "Final Term Exam");
  const [examSubject, setExamSubject] = useState(existingCfg.exam_subject ?? "");
  const [catalogue,   setCatalogue]   = useState<Catalogue | null>(null);

  /* ── sections/rows ── */
  const [semSections, setSemSections] = useState<SemesterSection[]>(
    existingCfg.semester_sections ?? []
  );
  const [rowPolicy, _setRowPolicy] = useState<RowPolicy>(existingCfg.row_policy ?? "interleave");

  /* ── invigilators ── */
  const [allInvigs,     setAllInvigs]     = useState<Invigilator[]>([]);
  const [selInvigIds,   setSelInvigIds]   = useState<number[]>([]);

  /* ── preview ── */
  const [previewRows, setPreviewRows] = useState<(Seat | null)[][]>([]);
  const [step,        setStep]        = useState<1 | 2 | 3>(1);
  const [err,         setErr]         = useState("");
  const [saving,      setSaving]      = useState(false);

  /* fetch catalogue + invigilators */
  useEffect(() => {
    api<Catalogue>("/exams-catalogue").then(setCatalogue).catch(() => {});
    api<Invigilator[]>("/invigilators").then(rows => {
      setAllInvigs(rows);
      if (hall) {
        // preload existing invigilator selection via seating fetch
        api<Seating>(`/${hall.id}/seating?date=${today()}`).then(s => {
          setSelInvigIds(s.invigilators.map(i => i.id));
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [hall]);

  /* auto rebuild preview whenever semSections or capacity change */
  useEffect(() => {
    if (semSections.length === 0) { setPreviewRows([]); return; }
    setPreviewRows(buildSeatingRows(semSections, capacity));
  }, [semSections, capacity, rowPolicy]);

  /* ── helpers ── */
  function addSemSection() {
    setSemSections(prev => [...prev, {
      semester: 1,
      batch: DEFAULT_BATCHES[1],
      sections: ["A"],
      roll_from: 1,
      roll_to: 50,
      row_pref: "any",
    }]);
  }

  function removeSemSection(idx: number) {
    setSemSections(prev => prev.filter((_, i) => i !== idx));
  }

  function updateSemSection<K extends keyof SemesterSection>(idx: number, key: K, value: SemesterSection[K]) {
    setSemSections(prev => prev.map((ss, i) => {
      if (i !== idx) return ss;
      const updated = { ...ss, [key]: value };
      // auto-update batch when semester changes
      if (key === "semester") {
        updated.batch = DEFAULT_BATCHES[value as number] ?? ss.batch;
      }
      return updated;
    }));
  }

  function toggleSection(idx: number, letter: string) {
    const curr = semSections[idx].sections;
    const next = curr.includes(letter) ? curr.filter(s => s !== letter) : [...curr, letter];
    updateSemSection(idx, "sections", next.length ? next : [letter]);
  }

  function toggleInvig(id: number) {
    setSelInvigIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Hall name is required."); return; }
    if (capacity < 1)  { setErr("Capacity must be at least 1."); return; }

    setSaving(true); setErr("");

    const rows = previewRows.length > 0
      ? previewRows.map(row => row.map(s => s ?? null))
      : undefined;

    const config: HallConfig = {
      exam_name: examType,
      exam_subject: examSubject,
      semester_sections: semSections,
      row_policy: rowPolicy,
    };

    const body = {
      name: name.trim(),
      building: building.trim(),
      kind,
      capacity,
      date,
      exam_name: examType,
      exam_subject: examSubject,
      invigilator_ids: selInvigIds,
      rows,
      config,
    };

    try {
      if (hall) {
        await api(`/${hall.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("", { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const totalStudents = semSections.reduce((acc, ss) => acc + Math.max(0, ss.roll_to - ss.roll_from + 1), 0);
  const previewSections = Array.from(new Set(previewRows.flat().filter(Boolean).map(s => s!.section)));

  return (
    <Modal
      title={hall ? `Edit — ${hall.name}` : "Add Examination Hall"}
      onClose={onClose}
      extraWide
    >
      {/* step tabs */}
      <div className="hl-step-tabs">
        {(["1. Hall Info", "2. Sections & Rows", "3. Invigilators"] as const).map((label, i) => (
          <button
            key={i}
            type="button"
            className={`hl-step-tab ${step === i + 1 ? "active" : ""}`}
            onClick={() => setStep((i + 1) as 1 | 2 | 3)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="hl-form" onSubmit={handleSave}>
        {/* ──────────── STEP 1 : Hall Info + Exam ──────────── */}
        {step === 1 && (
          <>
            <div className="hl-section-title">Hall Details</div>
            <div className="hl-row2">
              <label>Hall name
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="LH-5" />
              </label>
              <label>Building / location
                <input value={building} onChange={e => setBuilding(e.target.value)} placeholder="Academic Block A" />
              </label>
            </div>
            <div className="hl-row2">
              <label>Type
                <select value={kind} onChange={e => setKind(e.target.value as Kind)}>
                  <option value="lecture">Lecture Hall</option>
                  <option value="section">Pure Section Room</option>
                </select>
              </label>
              <label>Total seat capacity
                <input type="number" min={1} max={500} required value={capacity}
                       onChange={e => setCapacity(Number(e.target.value))} />
              </label>
            </div>

            <div className="hl-section-title" style={{ marginTop: 8 }}>Examination Details</div>
            <div className="hl-row2">
              <label>Exam type
                <select value={examType} onChange={e => setExamType(e.target.value)}>
                  {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label>Exam date
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </label>
            </div>
            <label>Exam subject / course (optional)
              <select value={examSubject} onChange={e => setExamSubject(e.target.value)}>
                <option value="">— All subjects / not specified —</option>
                {catalogue && Object.entries(catalogue.subjects).map(([sem, courses]) => (
                  <optgroup key={sem} label={`Semester ${sem}`}>
                    {courses.map(c => (
                      <option key={c.code} value={`${c.code} — ${c.title}`}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="hl-form-nav">
              <span />
              <button type="button" className="hl-btn hl-btn-primary" onClick={() => setStep(2)}>
                Next: Sections &amp; Rows →
              </button>
            </div>
          </>
        )}

        {/* ──────────── STEP 2 : Sections, Semesters, Rows ──────────── */}
        {step === 2 && (
          <>
            <div className="hl-section-title">
              Semester Sections in this Hall
              <span className="hl-badge">{totalStudents} students · {capacity} seats</span>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#686158" }}>
              Add one entry per semester group. Choose which sections (A, B, C) and roll-number range.
              You can assign even or odd rows to each group to interleave them in the seating grid.
            </p>

            {semSections.length === 0 && (
              <div className="hl-empty-state">
                <Icon d={I.info} size={28} />
                <p>No sections added yet. Click "Add Section Group" to assign students to this hall.</p>
              </div>
            )}

            {semSections.map((ss, idx) => (
              <div key={idx} className="hl-sem-card">
                <div className="hl-sem-card-header">
                  <span className="hl-sem-badge">Group {idx + 1}</span>
                  <button type="button" className="hl-icon-btn" onClick={() => removeSemSection(idx)} title="Remove">
                    <Icon d={I.close} size={14} />
                  </button>
                </div>

                <div className="hl-row3">
                  <label>Semester
                    <select value={ss.semester} onChange={e => updateSemSection(idx, "semester", Number(e.target.value))}>
                      {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </label>
                  <label>Batch code
                    <input value={ss.batch} onChange={e => updateSemSection(idx, "batch", e.target.value)}
                           placeholder="F23-BSSE" />
                  </label>
                  <label>Row assignment
                    <select value={ss.row_pref ?? "any"} onChange={e => updateSemSection(idx, "row_pref", e.target.value as "even"|"odd"|"any")}>
                      <option value="any">Any rows</option>
                      <option value="even">Even rows (R2, R4, R6…)</option>
                      <option value="odd">Odd rows (R1, R3, R5…)</option>
                    </select>
                  </label>
                </div>

                <label style={{ marginTop: 10 }}>Sections (tick all that apply)</label>
                <div className="hl-section-chips">
                  {SECTION_LETTERS.map(letter => (
                    <button
                      key={letter}
                      type="button"
                      className={`hl-sec-chip ${ss.sections.includes(letter) ? "on" : ""}`}
                      onClick={() => toggleSection(idx, letter)}
                    >
                      {ss.semester}{letter}
                    </button>
                  ))}
                </div>

                <div className="hl-row2" style={{ marginTop: 10 }}>
                  <label>Roll from (number only)
                    <div className="hl-roll-preview">
                      <span className="hl-roll-prefix">{ss.batch}-</span>
                      <input type="number" min={1} max={999} value={ss.roll_from}
                             onChange={e => updateSemSection(idx, "roll_from", Number(e.target.value))} />
                    </div>
                  </label>
                  <label>Roll to (number only)
                    <div className="hl-roll-preview">
                      <span className="hl-roll-prefix">{ss.batch}-</span>
                      <input type="number" min={1} max={999} value={ss.roll_to}
                             onChange={e => updateSemSection(idx, "roll_to", Number(e.target.value))} />
                    </div>
                  </label>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#686158" }}>
                  Students: <b>{Math.max(0, ss.roll_to - ss.roll_from + 1)}</b>
                  &nbsp;·&nbsp;Rolls: <b>{ss.batch}-{String(ss.roll_from).padStart(3,"0")}</b> to <b>{ss.batch}-{String(ss.roll_to).padStart(3,"0")}</b>
                </p>
              </div>
            ))}

            <button type="button" className="hl-btn" style={{ width: "100%", justifyContent: "center" }}
                    onClick={addSemSection}>
              <Icon d={I.plus} /> Add Section Group
            </button>

            {/* Seat preview */}
            {previewRows.length > 0 && (
              <div className="hl-preview-wrap">
                <div className="hl-section-title">Seating Preview
                  <span className="hl-badge">{totalStudents} seated · {capacity} seats</span>
                </div>
                <div className="hl-board">Front · Board / Invigilator Desk</div>
                <div className="hl-map">
                  {previewRows.map((row, r) => {
                    const first = row.find(Boolean);
                    const cols = row.length;
                    return (
                      <div className="hl-seat-row" key={r}>
                        <span className="hl-rowno">R{r + 1}</span>
                        <div className="hl-seats-line" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                          {row.map((s, c) => s
                            ? <div key={c} className={`hl-seat ${sectionClass(previewSections, s.section)}`} title={s.roll}>
                                {s.roll.split("-").pop()}
                              </div>
                            : <div key={c} className="hl-seat empty" />
                          )}
                        </div>
                        <span className="hl-rowsec">{first ? first.section : ""}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="hl-legend">
                  {previewSections.map(s => (
                    <span key={s}><i className={sectionClass(previewSections, s)} /> {s}</span>
                  ))}
                  <span><i className="empty" /> Empty</span>
                </div>
              </div>
            )}

            <div className="hl-form-nav">
              <button type="button" className="hl-btn" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="hl-btn hl-btn-primary" onClick={() => setStep(3)}>
                Next: Invigilators →
              </button>
            </div>
          </>
        )}

        {/* ──────────── STEP 3 : Invigilators + Save ──────────── */}
        {step === 3 && (
          <>
            <div className="hl-section-title">
              Assign Invigilators
              <span className="hl-badge">{selInvigIds.length} selected</span>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#686158" }}>
              Select one or more teachers/invigilators for this hall on <b>{date}</b>.
              (1 invigilator per 30 students is recommended — needed: <b>{Math.max(1, Math.ceil(totalStudents / 30))}</b>)
            </p>

            <div className="hl-invig-grid">
              {allInvigs.map(inv => (
                <label key={inv.id} className={`hl-invig-card ${selInvigIds.includes(inv.id) ? "selected" : ""}`}>
                  <input type="checkbox" hidden checked={selInvigIds.includes(inv.id)} onChange={() => toggleInvig(inv.id)} />
                  <span className="hl-invig-check">{selInvigIds.includes(inv.id) && <Icon d={I.check} size={12} />}</span>
                  <div>
                    <strong>{inv.name}</strong>
                    <em>{inv.designation} · {inv.department}</em>
                  </div>
                </label>
              ))}
            </div>

            {/* summary */}
            <div className="hl-summary">
              <div><span>Hall</span><strong>{name || "—"}</strong></div>
              <div><span>Type</span><strong>{kind === "lecture" ? "Lecture Hall" : "Section Room"}</strong></div>
              <div><span>Capacity</span><strong>{capacity} seats</strong></div>
              <div><span>Exam</span><strong>{examType}</strong></div>
              <div><span>Date</span><strong>{date}</strong></div>
              <div><span>Students</span><strong>{totalStudents}</strong></div>
              <div><span>Section groups</span><strong>{semSections.length}</strong></div>
              <div><span>Invigilators</span><strong>{selInvigIds.length} assigned</strong></div>
            </div>

            {err && <div className="hl-error">{err}</div>}

            <div className="hl-form-nav">
              <button type="button" className="hl-btn" onClick={() => setStep(2)}>← Back</button>
              <button type="submit" className="hl-btn hl-btn-primary" disabled={saving}>
                {saving ? "Saving…" : hall ? "Save Changes" : "Create Hall"}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SEATING MODAL (view mode, click on hall card)
═══════════════════════════════════════════════════════════════ */
function SeatingModal({ hall, onClose }: { hall: Hall; onClose: () => void }) {
  const [date,  setDate]  = useState(today());
  const [data,  setData]  = useState<Seating | null>(null);
  const [all,   setAll]   = useState<Invigilator[]>([]);
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);
  const [adding, setAdding] = useState(false);
  const [version, setVersion] = useState(0);

  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    let stale = false;
    api<Seating>(`/${hall.id}/seating?date=${date}`)
      .then(d => { if (!stale) { setData(d); setErr(""); } })
      .catch(e => { if (!stale) setErr((e as Error).message); });
    return () => { stale = true; };
  }, [hall.id, date, version]);
  useEffect(() => { api<Invigilator[]>("/invigilators").then(setAll).catch(() => {}); }, []);

  async function reshuffle() {
    setBusy(true);
    try { await api("/generate", { method: "POST", body: JSON.stringify({ date, reshuffle: true }) }); refresh(); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  async function saveInvigilators(ids: number[]) {
    try {
      await api(`/${hall.id}/invigilators?date=${date}`, { method: "PUT", body: JSON.stringify({ invigilator_ids: ids }) });
      refresh();
    } catch (e) { setErr((e as Error).message); }
  }

  const current  = data?.invigilators ?? [];
  const free     = all.filter(a => !current.some(c => c.id === a.id));
  const sections = data?.sections ?? [];
  const cols     = Math.max(10, ...(data?.rows.map(r => r.length) ?? [10]));

  return (
    <Modal wide onClose={onClose}
           title={<>{hall.name}<small>{hall.building} · {hall.capacity} seats</small></>}>

      {/* exam info bar */}
      {data && (data.exam_name || data.exam_subject) && (
        <div className="hl-exam-info-bar">
          <span><b>Exam:</b> {data.exam_name}</span>
          {data.exam_subject && <span><b>Course:</b> {data.exam_subject}</span>}
        </div>
      )}

      {/* tools */}
      <div className="hl-seat-tools">
        <label>Exam date
          <input type="date" value={date} onChange={e => { setData(null); setDate(e.target.value); }} />
        </label>
        <button className="hl-btn hl-btn-primary" disabled={busy} onClick={reshuffle}>
          <Icon d={I.shuffle} /> {busy ? "Shuffling…" : "Reshuffle seating"}
        </button>
        {data && (
          <span className="hl-count">
            {data.students} students · {sections.length || "no"} section{sections.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {err && <div className="hl-error">{err}</div>}
      {!data && !err && <div className="hl-muted hl-pad">Loading seating plan…</div>}

      {/* invigilators */}
      <section className="hl-inv">
        <div className="hl-inv-head">
          <h4>Invigilators <span>({current.length}/{data?.required_invigilators ?? 0} needed)</span></h4>
          <button className="hl-btn hl-btn-sm" onClick={() => setAdding(a => !a)}>
            <Icon d={I.plus} size={14} /> Change
          </button>
        </div>
        <div className="hl-chips">
          {current.length === 0 && (
            <span className="hl-muted">
              {data?.students ? "No invigilator assigned." : "Hall not used on this date."}
            </span>
          )}
          {current.map(i => (
            <span key={i.id} className="hl-chip" title={`${i.designation} · ${i.department}`}>
              <b>{i.name}</b><em>{i.department}</em>
              <button onClick={() => saveInvigilators(current.filter(c => c.id !== i.id).map(c => c.id))} aria-label="Remove">×</button>
            </span>
          ))}
        </div>
        {adding && (
          <select className="hl-select" value="" onChange={e => {
            if (e.target.value) saveInvigilators([...current.map(c => c.id), Number(e.target.value)]);
            setAdding(false);
          }}>
            <option value="">Pick an invigilator to add…</option>
            {free.map(i => <option key={i.id} value={i.id}>{i.name} — {i.department}</option>)}
          </select>
        )}
      </section>

      {/* seat map */}
      <div className="hl-board">Front · Board / Invigilator Desk</div>
      <div className="hl-map">
        {data?.rows.map((row, r) => {
          const first = row.find(Boolean);
          return (
            <div className="hl-seat-row" key={r}>
              <span className="hl-rowno">R{r + 1}</span>
              <div className="hl-seats-line" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {row.map((s, c) => s
                  ? <div key={c} className={`hl-seat ${sectionClass(sections, s.section)}`} title={s.roll}>
                      {s.roll.split("-").pop()}
                    </div>
                  : <div key={c} className="hl-seat empty" />
                )}
              </div>
              <span className="hl-rowsec">{first ? first.section : ""}</span>
            </div>
          );
        })}
        {data && data.students === 0 && (
          <div className="hl-muted hl-pad">No students are seated in this hall on {date}.</div>
        )}
      </div>

      <div className="hl-legend">
        {sections.map(s => <span key={s}><i className={sectionClass(sections, s)} /> {s}</span>)}
        <span><i className="empty" /> Empty seat</span>
      </div>
      <p className="hl-note">
        Roll numbers inside a row never change order. Only the hall and row they sit in changes each day.
      </p>
    </Modal>
  );
}
