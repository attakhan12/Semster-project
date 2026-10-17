import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");

  function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.log({
      fullName,
      registrationNo,
      email,
      password,
      role,
    });

    // Real signup will be connected to Python later.
    navigate("/login");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <h1>ETIS</h1>

          <p>
            Examination Timetable
            <br />
            Information System
          </p>
        </div>

        <div className="auth-form-container">

          <h2>Create Account</h2>

          <p className="form-description">
            Create your ETIS account.
          </p>

          <form onSubmit={handleSignup}>

            <div className="form-group">
              <label htmlFor="fullName">
                Full Name
              </label>

              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registrationNo">
                Registration Number
              </label>

              <input
                id="registrationNo"
                type="text"
                placeholder="Example: BSSE-001"
                value={registrationNo}
                onChange={(event) =>
                  setRegistrationNo(event.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">
                Account Type
              </label>

              <select
                id="role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value)
                }
              >
                <option value="student">
                  Student
                </option>

                <option value="faculty">
                  Faculty
                </option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
            >
              Create Account
            </button>

          </form>

          <p className="auth-footer">
            Already have an account?{" "}
            <Link to="/login">
              Login
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
}