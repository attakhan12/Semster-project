import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      // Save basic user information for the frontend.
      sessionStorage.setItem(
        "etis_user",
        JSON.stringify(data.user)
      );

      navigate("/dashboard");

    } catch (err) {
      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
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

            {error && (
              <p style={{ color: "red", marginBottom: "12px" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? "Checking..." : "Login"}
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