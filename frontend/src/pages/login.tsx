import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import examBg from "../assets/auth-bg-exam.jpg";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div
      className="auth-page"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(16, 44, 36, 0.78) 0%, rgba(9, 25, 20, 0.86) 100%), url(${examBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        className="auth-card"
        style={{
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          backgroundColor: "rgba(251, 250, 246, 0.96)",
          boxShadow: "0 25px 65px rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
        }}
      >

        <div
          className="auth-brand"
          style={{
            backgroundImage: `linear-gradient(145deg, rgba(23, 75, 61, 0.90) 0%, rgba(14, 45, 36, 0.95) 100%), url(${examBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
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

              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  style={{ paddingRight: "44px" }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#686158",
                  }}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
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