
from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/datesheet", tags=["Date Sheet"])


# Official Software Engineering semester catalogue.
# Credits are stored as total credits (theory + practical).
SUBJECTS = {
    1: [
        {"code": "SE-111", "title": "Programming Fundamentals", "credits": "4 (3 + 1)"},
        {"code": "SE-112", "title": "Application of Information & Communication Technologies (ICT)", "credits": "3 (2 + 1)"},
        {"code": "MT-101", "title": "Calculus and Analytical Geometry", "credits": "3 (3 + 0)"},
        {"code": "PH-101", "title": "Applied Physics / Basic Science", "credits": "3 (3 + 0)"},
        {"code": "HU-101", "title": "English Composition & Comprehension", "credits": "3 (3 + 0)"},
        {"code": "HU-102", "title": "Islamic Studies / Ethics", "credits": "2 (2 + 0)"},
    ],
    2: [
        {"code": "SE-121", "title": "Object-Oriented Programming (OOP)", "credits": "4 (3 + 1)"},
        {"code": "SE-122", "title": "Discrete Structures", "credits": "3 (3 + 0)"},
        {"code": "SE-123", "title": "Introduction to Software Engineering", "credits": "3 (3 + 0)"},
        {"code": "HU-121", "title": "Communication & Presentation Skills", "credits": "3 (3 + 0)"},
        {"code": "MT-121", "title": "Linear Algebra", "credits": "3 (3 + 0)"},
        {"code": "HU-122", "title": "Pakistan Studies", "credits": "2 (2 + 0)"},
    ],
    3: [
        {"code": "SE-211", "title": "Data Structures and Algorithms (DSA)", "credits": "4 (3 + 1)"},
        {"code": "SE-212", "title": "Software Requirements Engineering", "credits": "3 (2 + 1)"},
        {"code": "SE-213", "title": "Digital Logic Design (DLD)", "credits": "3 (2 + 1)"},
        {"code": "MT-211", "title": "Probability and Statistics", "credits": "3 (3 + 0)"},
        {"code": "HU-211", "title": "Technical and Business Writing", "credits": "3 (3 + 0)"},
    ],
    4: [
        {"code": "SE-221", "title": "Database Management Systems (DBMS)", "credits": "4 (3 + 1)"},
        {"code": "SE-222", "title": "Software Design and Architecture", "credits": "3 (3 + 0)"},
        {"code": "SE-223", "title": "Operating Systems", "credits": "3 (2 + 1)"},
        {"code": "SE-224", "title": "Human-Computer Interaction (HCI)", "credits": "3 (2 + 1)"},
        {"code": "SE-225", "title": "Theory of Automata and Formal Languages", "credits": "3 (3 + 0)"},
    ],
    5: [
        {"code": "SE-311", "title": "Software Construction and Development", "credits": "3 (2 + 1)"},
        {"code": "SE-312", "title": "Software Project Management", "credits": "3 (2 + 1)"},
        {"code": "SE-313", "title": "Computer Networks", "credits": "3 (2 + 1)"},
        {"code": "SE-314", "title": "Web Engineering / Full-Stack Development", "credits": "3 (2 + 1)"},
        {"code": "SE-315", "title": "Computer Organization and Assembly Language", "credits": "3 (2 + 1)"},
    ],
    6: [
        {"code": "SE-321", "title": "Software Quality Engineering and Testing", "credits": "3 (2 + 1)"},
        {"code": "SE-322", "title": "Design and Analysis of Algorithms", "credits": "3 (3 + 0)"},
        {"code": "SE-323", "title": "Information Security", "credits": "3 (2 + 1)"},
        {"code": "SE-324", "title": "Mobile Application Development", "credits": "3 (2 + 1)"},
        {"code": "SE-325", "title": "Software Engineering Elective - I", "credits": "3 (3 + 0)"},
    ],
    7: [
        {"code": "SE-411", "title": "Software Re-engineering & Maintenance", "credits": "3 (3 + 0)"},
        {"code": "SE-412", "title": "Cloud Computing & Distributed Systems", "credits": "3 (2 + 1)"},
        {"code": "SE-413", "title": "Software Engineering Project - I", "credits": "2 (0 + 2)"},
        {"code": "SE-414", "title": "Software Engineering Elective - II", "credits": "3 (2 + 1)"},
        {"code": "SE-415", "title": "Professional Practices & Entrepreneurship", "credits": "2 (2 + 0)"},
    ],
    8: [
        {"code": "SE-421", "title": "Software Engineering Project - II", "credits": "4 (0 + 4)"},
        {"code": "SE-422", "title": "Software Engineering Elective - III", "credits": "3 (3 + 0)"},
        {"code": "SE-423", "title": "Software Engineering Elective - IV", "credits": "3 (3 + 0)"},
        {"code": "SE-424", "title": "Technology Management / Engineering Management", "credits": "3 (3 + 0)"},
    ],
}


class DateSheetRequest(BaseModel):
    semesters: list[int] = Field(min_length=1)
    exam_type: Literal["Mid Term Exam", "Final Term Exam"] = "Mid Term Exam"
    start_date: date
    end_date: date | None = None
    start_time: str = "09:00"
    duration_minutes: int | None = None
    study_gap_days: int = Field(default=0, ge=0, le=14)
    skip_sundays: bool = True
    holidays: list[date] = Field(default_factory=list)
    subjects: dict[int, list[str]] | None = None


def next_exam_day(
    current: date,
    skip_sundays: bool,
    holidays: set[date],
) -> date:
    while current in holidays or (skip_sundays and current.weekday() == 6):
        current += timedelta(days=1)
    return current


@router.get("/subjects")
def get_subjects(semester: int):
    if semester not in SUBJECTS:
        raise HTTPException(status_code=400, detail="Semester must be between 1 and 8.")

    return {"semester": semester, "subjects": SUBJECTS[semester]}


@router.post("/generate")
def generate_datesheet(request: DateSheetRequest):
    semesters = sorted(set(request.semesters))

    if any(semester not in SUBJECTS for semester in semesters):
        raise HTTPException(status_code=400, detail="Select semesters from 1 to 8.")

    if request.end_date and request.end_date < request.start_date:
        raise HTTPException(status_code=400, detail="End date must be on or after start date.")

    try:
        exam_start = datetime.strptime(request.start_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Start time must use HH:MM format.")

    if request.duration_minutes is not None:
        duration = request.duration_minutes
    else:
        duration = 90 if request.exam_type == "Mid Term Exam" else 150

    if duration < 30 or duration > 360:
        raise HTTPException(status_code=400, detail="Exam duration must be between 30 and 360 minutes.")

    holidays = set(request.holidays)
    selected_courses: dict[int, list[dict]] = {}

    # Optional course selections use course codes, not course titles.
    for semester in semesters:
        available = SUBJECTS[semester]
        requested_codes = (request.subjects or {}).get(semester)

        if requested_codes is None:
            selected_courses[semester] = available.copy()
        else:
            chosen = [course for course in available if course["code"] in requested_codes]
            if not chosen:
                raise HTTPException(
                    status_code=400,
                    detail=f"Select at least one course for Semester {semester}.",
                )
            selected_courses[semester] = chosen

    # Schedule one paper per selected semester on each exam day.
    # The same calendar is shared across all selected semesters.
    remaining = {semester: list(courses) for semester, courses in selected_courses.items()}
    calendar_rows = []
    flat_datesheet = []
    current_date = next_exam_day(request.start_date, request.skip_sundays, holidays)

    while any(remaining.values()):
        if request.end_date and current_date > request.end_date:
            unfinished = [
                f"Semester {semester}: {len(courses)} paper(s)"
                for semester, courses in remaining.items()
                if courses
            ]
            raise HTTPException(
                status_code=400,
                detail=(
                    "The selected end date is too early for all papers. "
                    "Extend the end date or reduce the study gap. Remaining: "
                    + ", ".join(unfinished)
                ),
            )

        try:
            exam_start_dt = datetime.combine(current_date, exam_start)
            exam_end_dt = exam_start_dt + timedelta(minutes=duration)
        except OverflowError:
            raise HTTPException(status_code=400, detail="The exam time is invalid.")

        row = {
            "date": current_date.isoformat(),
            "day": current_date.strftime("%A"),
            "exams": {},
        }

        for semester in semesters:
            if not remaining[semester]:
                row["exams"][str(semester)] = None
                continue

            course = remaining[semester].pop(0)
            exam = {
                "semester": semester,
                "exam_type": request.exam_type,
                "course_code": course["code"],
                "subject": course["title"],
                "credit_hours": course["credits"],
                "exam_date": current_date.isoformat(),
                "day": current_date.strftime("%A"),
                "start_time": exam_start_dt.strftime("%H:%M"),
                "end_time": exam_end_dt.strftime("%H:%M"),
                "duration_minutes": duration,
            }
            row["exams"][str(semester)] = exam
            flat_datesheet.append(exam)

        calendar_rows.append(row)

        # Move to the next permitted exam date, respecting the selected gap.
        current_date += timedelta(days=request.study_gap_days + 1)
        current_date = next_exam_day(current_date, request.skip_sundays, holidays)

    actual_end_date = date.fromisoformat(calendar_rows[-1]["date"]) if calendar_rows else request.start_date

    return {
        "success": True,
        "exam_type": request.exam_type,
        "semesters": semesters,
        "start_date": calendar_rows[0]["date"] if calendar_rows else request.start_date.isoformat(),
        "end_date": actual_end_date.isoformat(),
        "total_exam_days": len(calendar_rows),
        "total_papers": len(flat_datesheet),
        "duration_minutes": duration,
        "start_time": request.start_time,
        "calendar": calendar_rows,
        "datesheet": flat_datesheet,
    }
