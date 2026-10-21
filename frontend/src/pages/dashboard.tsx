
import {
  CalendarDays,
  DoorOpen,
  ClipboardList,
  Users,
  ShieldCheck,
  Mail,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
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
            onClick={() => navigate("/datesheet")}
          >
            <Sparkles size={17} />
            <span>Generate Timetable</span>
          </button>

          <nav className="navigation">
            <a
              href="/dashboard"
              className="nav-item active"
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
              className="nav-item"
              onClick={(event) => {
                event.preventDefault();
                navigate("/datesheet");
              }}
            >
              <CalendarDays size={18} />
              <span>Datesheet</span>
            </a>

            <a
              href="#halls"
              className="nav-item"
              onClick={(event) => event.preventDefault()}
            >
              <DoorOpen size={18} />
              <span>Halls</span>
            </a>

            <a
              href="#duties"
              className="nav-item"
              onClick={(event) => event.preventDefault()}
            >
              <ClipboardList size={18} />
              <span>Duties</span>
            </a>

            <a
              href="#students"
              className="nav-item"
              onClick={(event) => event.preventDefault()}
            >
              <Users size={18} />
              <span>Students</span>
            </a>

            <a
              href="#rules"
              className="nav-item"
              onClick={(event) => event.preventDefault()}
            >
              <ShieldCheck size={18} />
              <span>Rules</span>
            </a>

            <a
              href="#contact"
              className="nav-item"
              onClick={(event) => event.preventDefault()}
            >
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

          <p className="university-name">
            Foundation University Islamabad
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="top-bar">
          <span>Phase 1 · Accounts</span>

          <span className="api-status">
            Python API online
          </span>
        </div>

        <section className="hero-section">
          <p className="eyebrow">
            SOFTWARE ENGINEERING EXAM CELL
          </p>

          <h2>Good afternoon</h2>

          <p className="hero-description">
            Students and faculty can register.
            Messages sent from Contact appear below.
            Halls, the datesheet, and duties are still
            empty on purpose.
          </p>
        </section>

        {/* ACCOUNT CARD */}
        <section className="account-card">
          <p className="card-label">ACCOUNT</p>

          <h3>Examination Cell</h3>

          <p className="account-role">
            Examination cell · Department of Software Engineering
          </p>

          <p className="account-id">EXAM-001</p>

          <div className="account-details">
            <div>
              <span>EMAIL</span>
              <strong>examcell@fui.edu.pk</strong>
            </div>

            <div>
              <span>OPENED</span>
              <strong>15 Oct 2026</strong>
            </div>

            <div>
              <span>PHONE</span>
              <strong>Not given</strong>
            </div>
          </div>
        </section>

        {/* STATUS CARDS */}
        <section className="status-grid">
          <StatusCard
            status="OPEN"
            title="Board"
            description="Your examination home for this phase."
            active
          />

          <StatusCard
            status="WAITING"
            title="Datesheet"
            description="Open the datesheet generator."
            onClick={() => navigate("/datesheet")}
          />

          <StatusCard
            status="WAITING"
            title="Halls"
            description="Lecture halls and pure-section rooms."
          />

          <StatusCard
            status="WAITING"
            title="Duties"
            description="Invigilation roster, still to be added."
          />

          <StatusCard
            status="WAITING"
            title="Students"
            description="Student records will appear here."
          />

          <StatusCard
            status="WAITING"
            title="Rules"
            description="Examination rules will appear here."
          />

          <StatusCard
            status="OPEN"
            title="Contact"
            description="Messages sent to the examination cell."
            active
          />
        </section>
      </main>
    </div>
  );
}

/* STATUS CARD COMPONENT */

type StatusCardProps = {
  status: "OPEN" | "WAITING";
  title: string;
  description: string;
  active?: boolean;
  onClick?: () => void;
};

function StatusCard({
  status,
  title,
  description,
  active = false,
  onClick,
}: StatusCardProps) {
  return (
    <div
      className={`status-card ${active ? "status-card-active" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <p className="status">{status}</p>

      <h4>{title}</h4>

      <p className="status-description">
        {description}
      </p>
    </div>
  );
}
