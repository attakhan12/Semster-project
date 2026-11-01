import { NavLink, useNavigate } from "react-router-dom";
import {
  CalendarDays, DoorOpen, ClipboardList, Users,
  ShieldCheck, Mail, LayoutDashboard, Sparkles,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Board", icon: LayoutDashboard },
  { to: "/datesheet", label: "Datesheet", icon: CalendarDays },
  { to: "/halls", label: "Halls", icon: DoorOpen },
  { to: "/duties", label: "Duties", icon: ClipboardList },
  { to: "/students", label: "Students", icon: Users },
  { to: "/rules", label: "Rules", icon: ShieldCheck },
  { to: "/contact", label: "Contact", icon: Mail },
];

export default function Sidebar() {
  const navigate = useNavigate();
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <h1>ETIS</h1>
          <p>Software Engineering<br />Exam Cell</p>
        </div>

        <button className="generate-button" onClick={() => navigate("/datesheet")}>
          <Sparkles size={17} />
          <span>Generate Timetable</span>
        </button>

        <nav className="navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <strong>Examination Cell</strong>
          <span>Examination cell</span>
        </div>
        <button className="signout-button" onClick={() => navigate("/login")}>Sign out</button>
        <p className="university-name">Foundation University Islamabad</p>
      </div>
    </aside>
  );
}