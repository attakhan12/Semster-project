import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.log("Email:", email);
    console.log("Password:", password);

    // Real authentication will be connected to Python later.
    navigate("/dashboard");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <h1>ETIS-SYSTEM</h1>
          <p>
            Examination-Timetable
            <br />
            Information System
          </p>
        </div>

        <div className="auth-form-container">
          <h2>Welcome Back</h2>

          <p className="form-description">
            Sign in to continue to your dashboard.
          </p>

          <form onSubmit={handleLogin}>

            <div className="form-group">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
            >
              Login
            </button>

          </form>

          <p className="auth-footer">
            Don't have an account?{" "}
            <Link to="/signup">
              Create an account
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
}