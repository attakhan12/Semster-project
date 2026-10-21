
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  DoorOpen,
  ClipboardList,
  Users,
  ShieldCheck,
  Mail,
  LayoutDashboard,
  Sparkles,
  Download,
  Printer,
  X,
  CalendarCheck,
  Clock3,
  CalendarOff,
} from "lucide-react";
import "../datesheet.css";

const API = "http://127.0.0.1:8000/api/datesheet";

type Course = {
  code: string;
  title: string;
  credits: string;
};

type Exam = {
  semester: number;
  exam_type: string;
  course_code: string;
  subject: string;
  credit_hours: string;
  exam_date: string;
  day: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
};

type CalendarRow = {
  date: string;
  day: string;
  exams: Record<string, Exam | null>;
};

type Session = "Fall" | "Spring" | "All";

const ALL_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const FALL_SEMESTERS = [1, 3, 5, 7];
const SPRING_SEMESTERS = [2, 4, 6, 8];

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayString() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function DateSheet() {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [session, setSession] = useState<Session>("Fall");
  const [semesters, setSemesters] = useState<number[]>(FALL_SEMESTERS);
  const [examType, setExamType] = useState("Final Term Exam");

  const [coursesBySemester, setCoursesBySemester] = useState<
    Record<number, Course[]>
  >({});
  const [selectedCourses, setSelectedCourses] = useState<
    Record<number, string[]>
  >({});

  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:30");
  const [duration, setDuration] = useState(180);
  const [studyGap, setStudyGap] = useState(0);
  const [skipSundays, setSkipSundays] = useState(true);
  const [holidayText, setHolidayText] = useState("");

  const [calendar, setCalendar] = useState<CalendarRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [generatedSemesters, setGeneratedSemesters] = useState<number[]>([]);
  const [generatedExamType, setGeneratedExamType] = useState("");
  const [generatedStartDate, setGeneratedStartDate] = useState("");
  const [generatedEndDate, setGeneratedEndDate] = useState("");

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const allSelectedCourses = useMemo(
    () =>
      semesters.reduce(
        (total, semester) =>
          total + (selectedCourses[semester]?.length ?? 0),
        0,
      ),
    [semesters, selectedCourses],
  );

  const totalAvailableCourses = useMemo(
    () =>
      semesters.reduce(
        (total, semester) =>
          total + (coursesBySemester[semester]?.length ?? 0),
        0,
      ),
    [semesters, coursesBySemester],
  );

  const coursesForSelectedSemesters = useMemo(
    () =>
      semesters.flatMap((semester) =>
        (coursesBySemester[semester] ?? []).filter((course) =>
          (selectedCourses[semester] ?? []).includes(course.code),
        ),
      ),
    [semesters, coursesBySemester, selectedCourses],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setLoadingCourses(true);
      setError("");

      try {
        const results = await Promise.all(
          ALL_SEMESTERS.map(async (semester) => {
            const response = await fetch(
              `${API}/subjects?semester=${semester}`,
            );
            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data.detail || `Could not load Semester ${semester}.`,
              );
            }

            return [semester, data.subjects as Course[]] as const;
          }),
        );

        if (cancelled) return;

        const courseMap: Record<number, Course[]> = {};
        const selectedMap: Record<number, string[]> = {};

        for (const [semester, subjects] of results) {
          courseMap[semester] = subjects;
          selectedMap[semester] = subjects.map((course) => course.code);
        }

        setCoursesBySemester(courseMap);
        setSelectedCourses(selectedMap);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Cannot load courses. Check that the Python API is running.",
          );
        }
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    }

    void loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  function applySession(value: Session) {
    setSession(value);

    if (value === "Fall") setSemesters(FALL_SEMESTERS);
    else if (value === "Spring") setSemesters(SPRING_SEMESTERS);
    else setSemesters(ALL_SEMESTERS);
  }

  function toggleSemester(semester: number) {
    setSemesters((previous) => {
      const next = previous.includes(semester)
        ? previous.filter((item) => item !== semester)
        : [...previous, semester].sort((a, b) => a - b);

      if (
        next.length === FALL_SEMESTERS.length &&
        FALL_SEMESTERS.every((item) => next.includes(item))
      ) {
        setSession("Fall");
      } else if (
        next.length === SPRING_SEMESTERS.length &&
        SPRING_SEMESTERS.every((item) => next.includes(item))
      ) {
        setSession("Spring");
      } else if (next.length === ALL_SEMESTERS.length) {
        setSession("All");
      } else {
        setSession("All");
      }

      return next;
    });
  }

  function toggleCourse(semester: number, code: string) {
    setSelectedCourses((previous) => {
      const current = previous[semester] ?? [];
      const next = current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code];

      return { ...previous, [semester]: next };
    });
  }

  function selectAllCourses(semester: number) {
    const allCodes = (coursesBySemester[semester] ?? []).map(
      (course) => course.code,
    );

    setSelectedCourses((previous) => ({
      ...previous,
      [semester]: allCodes,
    }));
  }

  function clearCourses(semester: number) {
    setSelectedCourses((previous) => ({
      ...previous,
      [semester]: [],
    }));
  }

  async function generate() {
    setError("");
    setNotice("");

    if (semesters.length === 0) {
      setError("Select at least one semester.");
      return;
    }

    if (!startDate) {
      setError("Choose the first examination date.");
      return;
    }

    if (endDate && endDate < startDate) {
      setError("The end date must be on or after the start date.");
      return;
    }

    if (semesters.some((semester) => (selectedCourses[semester] ?? []).length === 0)) {
      setError("Select at least one course for every selected semester.");
      return;
    }

    const holidays = holidayText
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    const invalidHoliday = holidays.find(
      (value) => !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(new Date(`${value}T00:00:00`).getTime()),
    );

    if (invalidHoliday) {
      setError(
        `Invalid holiday date: ${invalidHoliday}. Use YYYY-MM-DD, for example 2026-10-25.`,
      );
      return;
    }

    setLoading(true);

    try {
      const subjectSelection: Record<number, string[]> = {};

      for (const semester of semesters) {
        subjectSelection[semester] = selectedCourses[semester] ?? [];
      }

      const payload = {
        semesters,
        exam_type: examType,
        start_date: startDate,
        end_date: endDate || null,
        start_time: startTime,
        duration_minutes: duration,
        study_gap_days: studyGap,
        skip_sundays: skipSundays,
        holidays,
        subjects: subjectSelection,
      };

      const response = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Timetable generation failed.");
      }

      setCalendar(data.calendar ?? []);
      setExams(data.datesheet ?? []);
      setGeneratedSemesters(data.semesters ?? semesters);
      setGeneratedExamType(data.exam_type ?? examType);
      setGeneratedStartDate(data.start_date ?? startDate);
      setGeneratedEndDate(data.end_date ?? "");
      setNotice(
        `Timetable generated successfully: ${data.total_papers} papers across ${data.total_exam_days} exam days.`,
      );
      setModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Timetable generation failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  function printTimetable() {
    window.print();
  }

  function downloadPdf() {
    if (!calendar.length) return;

    // Use the browser's print dialog and choose "Save as PDF".
    window.print();
  }

  return (
    <div className="dashboard datesheet-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <h1>ETIS</h1>
            <p>
              Software Engineering
              <br />
              Exam Cell
            </p>
          </div>

          <button
            className="generate-button"
            onClick={() => setModalOpen(true)}
          >
            <Sparkles size={17} />
            <span>Generate Timetable</span>
          </button>

          <nav className="navigation">
            <a
              href="/dashboard"
              className="nav-item"
              onClick={(event) => {
                event.preventDefault();
                navigate("/dashboard");
              }}
            >
              <LayoutDashboard size={18} />
              <span>Board</span>
            </a>

            <a
              href="/datesheet"
              className="nav-item active"
              onClick={(event) => event.preventDefault()}
            >
              <CalendarDays size={18} />
              <span>Datesheet</span>
            </a>

            <a href="#halls" className="nav-item">
              <DoorOpen size={18} />
              <span>Halls</span>
            </a>
            <a href="#duties" className="nav-item">
              <ClipboardList size={18} />
              <span>Duties</span>
            </a>
            <a href="#students" className="nav-item">
              <Users size={18} />
              <span>Students</span>
            </a>
            <a href="#rules" className="nav-item">
              <ShieldCheck size={18} />
              <span>Rules</span>
            </a>
            <a href="#contact" className="nav-item">
              <Mail size={18} />
              <span>Contact</span>
            </a>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <strong>Examination Cell</strong>
            <span>Examination cell</span>
          </div>
          <button
            className="signout-button"
            onClick={() => navigate("/login")}
          >
            Sign out
          </button>
          <p className="university-name">Foundation University Islamabad</p>
        </div>
      </aside>

      <main className="main-content datesheet-main">
        <div className="top-bar">
          <span>Phase 1 · Examination Management</span>
          <span className="api-status">
            {loadingCourses ? "Loading courses..." : "Python API online"}
          </span>
        </div>

        <div className="datesheet-toolbar">
          <span className="datesheet-pill">ETIS / EXAMINATION CELL</span>
          <button
            className="datesheet-light-button"
            onClick={() => setModalOpen(true)}
          >
            <Sparkles size={15} />
            Generate Exam Timetable
          </button>
        </div>

        <section className="official-heading">
          <p className="datesheet-eyebrow">
            DEPARTMENT OF SOFTWARE ENGINEERING
          </p>
          <h1>Official Examination Date Sheet</h1>
          <p>Foundation University Islamabad</p>
          <div className="official-rule" />

          <div className="official-meta">
            <span>
              <b>Session:</b> {session}
            </span>
            <span>
              <b>Semesters:</b>{" "}
              {generatedSemesters.length
                ? generatedSemesters.join(", ")
                : semesters.join(", ") || "Not selected"}
            </span>
            <span>
              <b>Examination:</b> {generatedExamType || examType}
            </span>
            <span>
              <b>Exam days:</b> {calendar.length || "Not generated"}
            </span>
          </div>
        </section>

        {error && <div className="datesheet-alert error">{error}</div>}
        {notice && <div className="datesheet-alert success">{notice}</div>}

        <section className="candidate-instructions">
          <h2>Candidate Instructions & Examination Rules</h2>
          <ol>
            <li>
              Students must arrive at the examination hall before the scheduled
              start time.
            </li>
            <li>
              Bring your university identification card and required
              stationery.
            </li>
            <li>
              Mobile phones and unauthorized electronic devices are not
              permitted unless expressly allowed.
            </li>
            <li>
              Follow all instructions issued by the invigilator and
              examination staff.
            </li>
            <li>
              Verify the course code, examination date, and time carefully.
            </li>
          </ol>
        </section>

        <section className="official-timetable">
          <div className="official-table-heading">
            <div>
              <p className="datesheet-eyebrow">EXAMINATION SCHEDULE</p>
              <h2>
                {generatedExamType || examType} — Combined Timetable
              </h2>
              {calendar.length > 0 && (
                <p>
                  {formatDate(generatedStartDate)} to{" "}
                  {formatDate(generatedEndDate)}
                </p>
              )}
            </div>

            <div className="table-actions">
              <button
                className="datesheet-light-button"
                onClick={printTimetable}
                disabled={!calendar.length}
              >
                <Printer size={15} />
                Print
              </button>
              <button
                className="datesheet-light-button"
                onClick={downloadPdf}
                disabled={!calendar.length}
              >
                <Download size={15} />
                Save PDF
              </button>
            </div>
          </div>

          {calendar.length === 0 ? (
            <div className="datesheet-empty">
              <CalendarDays size={32} />
              <h3>No date sheet generated yet</h3>
              <p>
                Select a session, multiple semesters, dates, holidays, and
                exam settings to generate your combined timetable.
              </p>
              <button
                className="datesheet-primary-button"
                onClick={() => setModalOpen(true)}
              >
                Generate Exam Timetable
              </button>
            </div>
          ) : (
            <div className="datesheet-grid-wrap">
              <table className="official-grid combined-grid">
                <thead>
                  <tr>
                    <th>Date / Day</th>
                    {generatedSemesters.map((semester) => (
                      <th key={semester}>Semester {semester}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendar.map((row) => (
                    <tr key={row.date}>
                      <th>
                        <strong>{formatDate(row.date)}</strong>
                        <small>{row.day}</small>
                      </th>

                      {generatedSemesters.map((semester) => {
                        const exam = row.exams[String(semester)];

                        return (
                          <td
                            key={`${row.date}-${semester}`}
                            className={exam ? "exam-cell" : "empty-exam-cell"}
                          >
                            {exam ? (
                              <div className="calendar-exam">
                                <strong>{exam.course_code}</strong>
                                <span>{exam.subject}</span>
                                <small>
                                  {exam.start_time} – {exam.end_time}
                                </small>
                                <small>{exam.credit_hours} credits</small>
                              </div>
                            ) : (
                              <span className="no-exam-label">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="datesheet-footnote">
            This schedule is generated for planning. The Examination Cell
            should verify it before official publication.
          </p>
        </section>

        <section className="datesheet-lower-grid">
          <div className="datesheet-info-card">
            <h3>Generation Summary</h3>
            <p>
              <b>Session:</b> {session}
            </p>
            <p>
              <b>Selected semesters:</b>{" "}
              {generatedSemesters.join(", ") || "Not generated"}
            </p>
            <p>
              <b>Total papers:</b> {exams.length}
            </p>
            <p>
              <b>Exam days:</b> {calendar.length}
            </p>
          </div>

          <div className="datesheet-info-card">
            <h3>Selected Courses</h3>
            {coursesForSelectedSemesters.length ? (
              coursesForSelectedSemesters.map((course) => (
                <p key={course.code}>
                  <b>{course.code}</b> — {course.title}
                </p>
              ))
            ) : (
              <p>Select semesters and courses in the generator.</p>
            )}
          </div>

          <div className="datesheet-info-card">
            <h3>Exam Period</h3>
            <p>
              <b>Start:</b> {formatDate(generatedStartDate)}
            </p>
            <p>
              <b>End:</b> {formatDate(generatedEndDate)}
            </p>
            <p>
              <b>Daily start:</b> {startTime}
            </p>
            <p>
              <b>Duration:</b> {duration} minutes
            </p>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div
          className="generator-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            className="generator-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="generator-title"
          >
            <div className="generator-modal-header">
              <div>
                <p className="datesheet-eyebrow">ETIS · SCHEDULING</p>
                <h2 id="generator-title">Generate Exam Timetable</h2>
                <p>Configure your examination calendar.</p>
              </div>
              <button
                className="modal-close"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="generator-fields">
              <label>
                Academic session
                <select
                  value={session}
                  onChange={(event) =>
                    applySession(event.target.value as Session)
                  }
                >
                  <option value="Fall">Fall — 1, 3, 5, 7</option>
                  <option value="Spring">Spring — 2, 4, 6, 8</option>
                  <option value="All">All semesters</option>
                </select>
              </label>

              <label>
                Examination type
                <select
                  value={examType}
                  onChange={(event) => setExamType(event.target.value)}
                >
                  <option value="Mid Term Exam">Mid Term Exam</option>
                  <option value="Final Term Exam">Final Term Exam</option>
                </select>
              </label>

              <label>
                First exam date
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>

              <label>
                Last permitted exam date
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>

              <label>
                Daily start time
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </label>

              <label>
                Exam duration
                <select
                  value={duration}
                  onChange={(event) =>
                    setDuration(Number(event.target.value))
                  }
                >
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={150}>2.5 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </label>

              <label>
                Gap between exam days
                <select
                  value={studyGap}
                  onChange={(event) =>
                    setStudyGap(Number(event.target.value))
                  }
                >
                  <option value={0}>No extra gap — daily</option>
                  <option value={1}>1 free day between exams</option>
                  <option value={2}>2 free days between exams</option>
                  <option value={3}>3 free days between exams</option>
                  <option value={7}>1 week between exams</option>
                </select>
              </label>
            </div>

            <div className="generator-section">
              <div className="course-select-heading">
                <div>
                  <h3>
                    <CalendarCheck size={17} /> Select semesters
                  </h3>
                  <p>{semesters.length} semesters selected</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSession("All");
                    setSemesters(ALL_SEMESTERS);
                  }}
                >
                  Select all
                </button>
              </div>

              <div className="semester-checkbox-grid">
                {ALL_SEMESTERS.map((semester) => (
                  <label
                    className="semester-option"
                    key={semester}
                  >
                    <input
                      type="checkbox"
                      checked={semesters.includes(semester)}
                      onChange={() => toggleSemester(semester)}
                    />
                    <span>Semester {semester}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="generator-section">
              <div className="course-select-heading">
                <div>
                  <h3>
                    <ClipboardList size={17} /> Course selection
                  </h3>
                  <p>
                    {allSelectedCourses} of {totalAvailableCourses} courses
                    selected
                  </p>
                </div>
              </div>

              {loadingCourses ? (
                <p>Loading official semester courses…</p>
              ) : (
                semesters.map((semester) => {
                  const courses = coursesBySemester[semester] ?? [];
                  const selectedForSemester =
                    selectedCourses[semester] ?? [];

                  return (
                    <div className="semester-course-group" key={semester}>
                      <div className="semester-course-heading">
                        <strong>Semester {semester}</strong>
                        <span>
                          {selectedForSemester.length}/{courses.length} courses
                        </span>
                        <button
                          type="button"
                          onClick={() => selectAllCourses(semester)}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => clearCourses(semester)}
                        >
                          Clear
                        </button>
                      </div>

                      <div className="course-select-list">
                        {courses.map((course) => (
                          <label
                            className="course-option"
                            key={course.code}
                          >
                            <input
                              type="checkbox"
                              checked={selectedForSemester.includes(
                                course.code,
                              )}
                              onChange={() =>
                                toggleCourse(semester, course.code)
                              }
                            />
                            <span className="course-option-code">
                              {course.code}
                            </span>
                            <span className="course-option-title">
                              {course.title}
                              <small>{course.credits} credit hours</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="generator-section">
              <div className="course-select-heading">
                <div>
                  <h3>
                    <CalendarOff size={17} /> Holidays and exam-free days
                  </h3>
                  <p>
                    Enter dates when no exams should take place.
                  </p>
                </div>
              </div>

              <label className="holiday-label">
                Holiday dates
                <textarea
                  rows={3}
                  value={holidayText}
                  onChange={(event) => setHolidayText(event.target.value)}
                  placeholder={"2026-10-25\n2026-10-27"}
                />
                <small>
                  Use YYYY-MM-DD format. Separate multiple dates with commas
                  or new lines.
                </small>
              </label>

              <label className="skip-sundays-option">
                <input
                  type="checkbox"
                  checked={skipSundays}
                  onChange={(event) => setSkipSundays(event.target.checked)}
                />
                <span>Do not schedule exams on Sundays</span>
              </label>

              <p className="datesheet-setting-note">
                <Clock3 size={15} />
                Each selected semester has at most one paper per exam day.
                The same date can hold papers for different semesters.
              </p>
            </div>

            {error && <div className="datesheet-alert error">{error}</div>}

            <div className="generator-modal-footer">
              <button
                className="datesheet-light-button"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="datesheet-primary-button"
                disabled={loading || loadingCourses}
                onClick={generate}
              >
                {loading ? "Generating timetable…" : "Generate Timetable"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
