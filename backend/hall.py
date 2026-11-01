"""
backend/hall.py  --  Halls, daily seating shuffle, exam configuration, and automatic/manual invigilator duty.
"""
from __future__ import annotations

import json
import math
import random
import sqlite3
from contextlib import contextmanager
from datetime import date as _date
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from datesheet import SUBJECTS

DB_PATH = Path(__file__).with_name("etis.db")
ROW_SIZE = 10                    # students per row block (001-010 in one row)
STUDENTS_PER_INVIGILATOR = 30    # 1 invigilator for every 30 students (min. 1 per used hall)

router = APIRouter(prefix="/api/halls", tags=["halls"])

DEFAULT_BATCHES = {
    1: "F24-BSSE",
    2: "SP24-BSSE",
    3: "F23-BSSE",
    4: "SP23-BSSE",
    5: "F22-BSSE",
    6: "SP22-BSSE",
    7: "F21-BSSE",
    8: "SP21-BSSE",
}

# ----------------------------------------------------------------------------- database
@contextmanager
def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


SEED_HALLS = [
    ("LH-1", "Academic Block A", "lecture", 80),
    ("LH-2", "Academic Block A", "lecture", 70),
    ("LH-3", "Academic Block B", "lecture", 60),
    ("LH-4", "Academic Block B", "lecture", 50),
    ("Section Room A", "Software Engineering Dept.", "section", 40),
    ("Section Room B", "Software Engineering Dept.", "section", 40),
    ("Section Room C", "Software Engineering Dept.", "section", 35),
]
# Default sections across semesters
SEED_SECTIONS = [
    ("1A", 1, 50), ("1B", 1, 50), ("1C", 1, 50),
    ("2A", 1, 50), ("2B", 1, 50), ("2C", 1, 50),
    ("3A", 1, 50), ("3B", 1, 50), ("3C", 1, 50),
    ("4A", 1, 50), ("4B", 1, 50), ("4C", 1, 50),
    ("5A", 1, 50), ("5B", 1, 50), ("5C", 1, 50),
    ("6A", 1, 50), ("6B", 1, 50), ("6C", 1, 50),
    ("7A", 1, 50), ("7B", 1, 50), ("7C", 1, 50),
    ("8A", 1, 50), ("8B", 1, 50), ("8C", 1, 50),
]

SEED_INVIGILATORS = [
    ("Mr. Ahmed Raza", "Software Engineering", "Lecturer"),
    ("Ms. Sana Iqbal", "Software Engineering", "Lecturer"),
    ("Mr. Bilal Hussain", "Computer Science", "Assistant Professor"),
    ("Ms. Ayesha Khan", "Computer Science", "Lecturer"),
    ("Mr. Usman Tariq", "Mathematics", "Lecturer"),
    ("Ms. Hina Malik", "Mathematics", "Assistant Professor"),
    ("Mr. Farhan Ali", "English", "Lecturer"),
    ("Ms. Maryam Shah", "English", "Lecturer"),
    ("Mr. Kamran Butt", "Physics", "Lecturer"),
    ("Ms. Rabia Noor", "Physics", "Assistant Professor"),
    ("Mr. Imran Qureshi", "Islamiat / Pak. Studies", "Lecturer"),
    ("Mr. Zahid Mehmood", "Administration", "Supervisor"),
]


def init_db() -> None:
    with db() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS halls(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                building TEXT NOT NULL DEFAULT '',
                kind TEXT NOT NULL CHECK(kind IN ('lecture','section')),
                capacity INTEGER NOT NULL CHECK(capacity > 0),
                config TEXT DEFAULT '');
            CREATE TABLE IF NOT EXISTS invigilators(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                department TEXT NOT NULL DEFAULT '',
                designation TEXT NOT NULL DEFAULT '',
                active INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS sections(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                roll_from INTEGER NOT NULL,
                roll_to INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS plans(
                day TEXT PRIMARY KEY,
                payload TEXT NOT NULL);
            """
        )
        try:
            con.execute("ALTER TABLE halls ADD COLUMN config TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass

        if not con.execute("SELECT 1 FROM halls").fetchone():
            con.executemany("INSERT INTO halls(name,building,kind,capacity) VALUES(?,?,?,?)", SEED_HALLS)
        if not con.execute("SELECT 1 FROM invigilators").fetchone():
            con.executemany("INSERT INTO invigilators(name,department,designation) VALUES(?,?,?)", SEED_INVIGILATORS)
        if not con.execute("SELECT 1 FROM sections").fetchone():
            con.executemany("INSERT INTO sections(name,roll_from,roll_to) VALUES(?,?,?)", SEED_SECTIONS)


init_db()


def load_students() -> dict[str, list[str]]:
    """{section: [roll numbers in order]}."""
    with db() as con:
        rows = con.execute("SELECT * FROM sections ORDER BY name").fetchall()
    return {r["name"]: [f"{r['name']}-{n:03d}" for n in range(r["roll_from"], r["roll_to"] + 1)] for r in rows}


# ----------------------------------------------------------------------------- schemas
class HallIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    building: str = Field(default="", max_length=80)
    kind: Literal["lecture", "section"] = "lecture"
    capacity: int = Field(gt=0, le=500)


class CreateHallWithSeatingIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    building: str = Field(default="", max_length=80)
    kind: Literal["lecture", "section"] = "lecture"
    capacity: int = Field(gt=0, le=500)
    date: Optional[str] = None
    exam_name: Optional[str] = "Final Term Exam"
    exam_subject: Optional[str] = ""
    invigilator_ids: list[int] = Field(default_factory=list)
    rows: Optional[list[list[Optional[dict]]]] = None
    config: Optional[dict] = None


class CustomSeatingIn(BaseModel):
    date: str
    exam_name: Optional[str] = "Final Term Exam"
    exam_subject: Optional[str] = ""
    invigilator_ids: list[int] = Field(default_factory=list)
    rows: list[list[Optional[dict]]]
    config: Optional[dict] = None


class InvigilatorIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    department: str = ""
    designation: str = ""


class SectionIn(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    roll_from: int = Field(ge=1)
    roll_to: int = Field(ge=1)


class GenerateIn(BaseModel):
    date: Optional[str] = None
    reshuffle: bool = False


class InvigilatorAssignIn(BaseModel):
    invigilator_ids: list[int]


# ----------------------------------------------------------------------------- seating engine
def _row_capacities(capacity: int) -> list[int]:
    full, rest = divmod(capacity, ROW_SIZE)
    return [ROW_SIZE] * full + ([rest] if rest else [])


def _take(queue: list[list[str]], cap: int) -> Optional[list[str]]:
    for i, block in enumerate(queue):
        if len(block) <= cap:
            return queue.pop(i)
    return None


def _fill_hall(hall: sqlite3.Row, queue: list[list[str]]) -> list[dict]:
    rows = []
    for cap in _row_capacities(hall["capacity"]):
        block = _take(queue, cap)
        seats = [{"roll": r, "section": r.split("-")[0]} for r in (block or [])]
        seats += [None] * (cap - len(seats))
        rows.append(seats)
    return rows


def _invigilator_load(exclude_day: str) -> dict[int, int]:
    load: dict[int, int] = {}
    with db() as con:
        for r in con.execute("SELECT day, payload FROM plans WHERE day != ?", (exclude_day,)):
            for h in json.loads(r["payload"])["halls"].values():
                for i in h.get("invigilators", []):
                    load[i] = load.get(i, 0) + 1
    return load


def build_plan(day: str, salt: int = 0) -> dict:
    rng = random.Random(f"{day}:{salt}")
    with db() as con:
        halls = con.execute("SELECT * FROM halls ORDER BY id").fetchall()
        invs = con.execute("SELECT * FROM invigilators WHERE active=1 ORDER BY id").fetchall()

    blocks: dict[str, list[list[str]]] = {}
    for sec, rolls in load_students().items():
        blocks[sec] = [rolls[i:i + ROW_SIZE] for i in range(0, len(rolls), ROW_SIZE)]
        rng.shuffle(blocks[sec])

    sec_names = list(blocks)
    rng.shuffle(sec_names)
    hall_order = list(halls)
    rng.shuffle(hall_order)

    layout: dict[int, list[dict]] = {}

    pure = [h for h in hall_order if h["kind"] == "section"]
    leftover_rooms = []
    for i, h in enumerate(pure):
        if i < len(sec_names):
            layout[h["id"]] = _fill_hall(h, blocks[sec_names[i]])
        else:
            leftover_rooms.append(h)

    pool: list[list[str]] = []
    while any(blocks.values()):
        for s in sec_names:
            if blocks[s]:
                pool.append(blocks[s].pop(0))
    for h in [h for h in hall_order if h["kind"] == "lecture"] + leftover_rooms:
        layout[h["id"]] = _fill_hall(h, pool)
    unseated = [r for b in pool for r in b]

    load = _invigilator_load(day)
    order = sorted(invs, key=lambda i: (load.get(i["id"], 0), rng.random()))
    taken: set[int] = set()
    out: dict[str, dict] = {}
    for h in halls:
        rows = layout[h["id"]]
        students = sum(1 for r in rows for s in r if s)
        need = max(1, math.ceil(students / STUDENTS_PER_INVIGILATOR)) if students else 0
        chosen = [i["id"] for i in order if i["id"] not in taken][:need]
        taken.update(chosen)
        out[str(h["id"])] = {
            "rows": rows,
            "students": students,
            "required": need,
            "invigilators": chosen,
            "exam_name": "Final Term Exam",
            "exam_subject": "",
        }
    return {"day": day, "halls": out, "unseated": unseated}


def get_plan(day: str, reshuffle: bool = False) -> dict:
    with db() as con:
        row = con.execute("SELECT payload FROM plans WHERE day=?", (day,)).fetchone()
        old = json.loads(row["payload"]) if row else None
    if old and not reshuffle:
        return old
    salt = (old.get("salt", 0) + 1) if (old and reshuffle) else 0
    plan = build_plan(day, salt)
    plan["salt"] = salt
    with db() as con:
        con.execute("INSERT OR REPLACE INTO plans(day,payload) VALUES(?,?)", (day, json.dumps(plan)))
    return plan


def _invalidate_future() -> None:
    with db() as con:
        con.execute("DELETE FROM plans WHERE day >= ?", (_date.today().isoformat(),))


def _day(d: Optional[str]) -> str:
    try:
        return _date.fromisoformat(d).isoformat() if d else _date.today().isoformat()
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")


def _hall_or_404(hall_id: int) -> sqlite3.Row:
    with db() as con:
        h = con.execute("SELECT * FROM halls WHERE id=?", (hall_id,)).fetchone()
    if not h:
        raise HTTPException(404, "Hall not found")
    return h


# ----------------------------------------------------------------------------- routes
@router.get("/exams-catalogue")
def exams_catalogue():
    """Return catalogue of all 8 Software Engineering semesters, courses, sections, and batch codes."""
    all_courses = []
    for sem, courses in SUBJECTS.items():
        for c in courses:
            all_courses.append({
                "semester": sem,
                "code": c["code"],
                "title": c["title"],
                "credits": c["credits"],
            })
    return {
        "subjects": SUBJECTS,
        "all_courses": all_courses,
        "semesters": list(range(1, 9)),
        "sections": ["A", "B", "C"],
        "batches": DEFAULT_BATCHES,
    }


@router.get("/invigilators")
def list_invigilators():
    with db() as con:
        return [dict(r) for r in con.execute("SELECT * FROM invigilators WHERE active=1 ORDER BY name")]


@router.post("/invigilators", status_code=201)
def add_invigilator(body: InvigilatorIn):
    try:
        with db() as con:
            cur = con.execute("INSERT INTO invigilators(name,department,designation) VALUES(?,?,?)",
                              (body.name.strip(), body.department, body.designation))
        return {"id": cur.lastrowid, **body.model_dump()}
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Invigilator already exists")


@router.delete("/invigilators/{inv_id}")
def remove_invigilator(inv_id: int):
    with db() as con:
        con.execute("UPDATE invigilators SET active=0 WHERE id=?", (inv_id,))
    _invalidate_future()
    return {"ok": True}


@router.get("/sections")
def list_sections():
    with db() as con:
        return [dict(r) for r in con.execute("SELECT * FROM sections ORDER BY name")]


@router.post("/sections", status_code=201)
def add_section(body: SectionIn):
    if body.roll_to < body.roll_from:
        raise HTTPException(400, "roll_to must be >= roll_from")
    with db() as con:
        con.execute("INSERT OR REPLACE INTO sections(name,roll_from,roll_to) VALUES(?,?,?)",
                    (body.name.strip().upper(), body.roll_from, body.roll_to))
    _invalidate_future()
    return {"ok": True}


@router.post("/generate")
def generate(body: GenerateIn):
    plan = get_plan(_day(body.date), body.reshuffle)
    return {"day": plan["day"], "unseated": plan.get("unseated", [])}


@router.get("")
def list_halls():
    with db() as con:
        halls = [dict(r) for r in con.execute("SELECT * FROM halls ORDER BY id")]
        used: dict[str, int] = {}
        for r in con.execute("SELECT payload FROM plans"):
            for hid, h in json.loads(r["payload"])["halls"].items():
                if h.get("students", 0):
                    used[hid] = used.get(hid, 0) + 1
    for h in halls:
        h["papers"] = used.get(str(h["id"]), 0)
        try:
            h["config"] = json.loads(h["config"]) if h.get("config") else {}
        except Exception:
            h["config"] = {}
    return halls


@router.post("", status_code=201)
def create_hall(body: CreateHallWithSeatingIn):
    cfg_str = json.dumps(body.config) if body.config else ""
    try:
        with db() as con:
            cur = con.execute("INSERT INTO halls(name,building,kind,capacity,config) VALUES(?,?,?,?,?)",
                              (body.name.strip(), body.building, body.kind, body.capacity, cfg_str))
            hall_id = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "A hall with this name already exists")

    day = _day(body.date)
    plan = get_plan(day)

    if body.rows:
        rows = body.rows
        students = sum(1 for r in rows for s in r if s)
        need = max(1, math.ceil(students / STUDENTS_PER_INVIGILATOR)) if students else 0
        inv_ids = list(dict.fromkeys(body.invigilator_ids))
        plan["halls"][str(hall_id)] = {
            "rows": rows,
            "students": students,
            "required": need,
            "invigilators": inv_ids,
            "exam_name": body.exam_name or "Final Term Exam",
            "exam_subject": body.exam_subject or "",
        }
        with db() as con:
            con.execute("INSERT OR REPLACE INTO plans(day,payload) VALUES(?,?)", (day, json.dumps(plan)))

    return {"id": hall_id, "name": body.name, "building": body.building, "kind": body.kind, "capacity": body.capacity, "papers": 1 if body.rows else 0}


@router.put("/{hall_id}")
def update_hall(hall_id: int, body: CreateHallWithSeatingIn):
    _hall_or_404(hall_id)
    cfg_str = json.dumps(body.config) if body.config else ""
    try:
        with db() as con:
            con.execute("UPDATE halls SET name=?,building=?,kind=?,capacity=?,config=? WHERE id=?",
                        (body.name.strip(), body.building, body.kind, body.capacity, cfg_str, hall_id))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "A hall with this name already exists")

    if body.rows:
        day = _day(body.date)
        plan = get_plan(day)
        rows = body.rows
        students = sum(1 for r in rows for s in r if s)
        need = max(1, math.ceil(students / STUDENTS_PER_INVIGILATOR)) if students else 0
        inv_ids = list(dict.fromkeys(body.invigilator_ids))
        plan["halls"][str(hall_id)] = {
            "rows": rows,
            "students": students,
            "required": need,
            "invigilators": inv_ids,
            "exam_name": body.exam_name or "Final Term Exam",
            "exam_subject": body.exam_subject or "",
        }
        with db() as con:
            con.execute("INSERT OR REPLACE INTO plans(day,payload) VALUES(?,?)", (day, json.dumps(plan)))

    return {"id": hall_id, "name": body.name, "building": body.building, "kind": body.kind, "capacity": body.capacity}


@router.put("/{hall_id}/custom-seating")
def save_custom_seating(hall_id: int, body: CustomSeatingIn):
    hall = _hall_or_404(hall_id)
    day = _day(body.date)
    plan = get_plan(day)

    rows = body.rows
    students = sum(1 for r in rows for s in r if s)
    need = max(1, math.ceil(students / STUDENTS_PER_INVIGILATOR)) if students else 0
    inv_ids = list(dict.fromkeys(body.invigilator_ids))

    plan["halls"][str(hall_id)] = {
        "rows": rows,
        "students": students,
        "required": need,
        "invigilators": inv_ids,
        "exam_name": body.exam_name or "Final Term Exam",
        "exam_subject": body.exam_subject or "",
    }
    with db() as con:
        con.execute("INSERT OR REPLACE INTO plans(day,payload) VALUES(?,?)", (day, json.dumps(plan)))
        if body.config:
            con.execute("UPDATE halls SET config=? WHERE id=?", (json.dumps(body.config), hall_id))
    return {"ok": True, "students": students, "required_invigilators": need}


@router.delete("/{hall_id}")
def delete_hall(hall_id: int):
    _hall_or_404(hall_id)
    with db() as con:
        con.execute("DELETE FROM halls WHERE id=?", (hall_id,))
    _invalidate_future()
    return {"ok": True}


@router.get("/{hall_id}/seating")
def hall_seating(hall_id: int, date: Optional[str] = Query(None)):
    hall = _hall_or_404(hall_id)
    day = _day(date)
    plan = get_plan(day)
    h = plan["halls"].get(str(hall_id))
    if h is None:
        plan = get_plan(day, reshuffle=True)
        h = plan["halls"][str(hall_id)]
    with db() as con:
        invs = {r["id"]: dict(r) for r in con.execute("SELECT * FROM invigilators")}

    cfg = {}
    try:
        cfg = json.loads(hall["config"]) if ("config" in hall.keys() and hall["config"]) else {}
    except Exception:
        pass

    return {
        "date": day,
        "hall": dict(hall),
        "rows": h["rows"],
        "students": h["students"],
        "required_invigilators": h["required"],
        "invigilators": [invs[i] for i in h.get("invigilators", []) if i in invs],
        "sections": sorted({s["section"] for r in h["rows"] for s in r if s}),
        "exam_name": h.get("exam_name", cfg.get("exam_name", "Final Term Exam")),
        "exam_subject": h.get("exam_subject", cfg.get("exam_subject", "")),
        "config": cfg,
        "unseated": plan.get("unseated", []),
    }


@router.put("/{hall_id}/invigilators")
def set_invigilators(hall_id: int, body: InvigilatorAssignIn, date: Optional[str] = Query(None)):
    _hall_or_404(hall_id)
    day = _day(date)
    plan = get_plan(day)
    ids = list(dict.fromkeys(body.invigilator_ids))
    for hid, h in plan["halls"].items():
        if hid != str(hall_id) and set(ids) & set(h.get("invigilators", [])):
            raise HTTPException(409, "An invigilator is already on duty in another hall that day")
    plan["halls"][str(hall_id)]["invigilators"] = ids
    with db() as con:
        con.execute("UPDATE plans SET payload=? WHERE day=?", (json.dumps(plan), day))
    return {"ok": True}
