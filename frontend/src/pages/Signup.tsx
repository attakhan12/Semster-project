import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import examBg from "../assets/auth-bg-exam.jpg";
import studyBg from "../assets/auth-bg-study.png";

function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); 
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    const trimmedFullName = fullName.trim();
    const trimmedRegNo = registrationNo.trim().toUpperCase();
    const trimmedEmail = email.trim();

    if (!trimmedFullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!trimmedRegNo) {
      setError("Please enter your registration number.");
      return;
    }

    // Format: Session & Admission Year (e.g. F23, F24) - Program (e.g. BSSE) - Roll No (e.g. 011)
    const regNoPattern = /^[A-Z]\d{2}-[A-Z]+-\d{3}$/;
    if (!regNoPattern.test(trimmedRegNo)) {
      setError(
        "Registration number must follow the format: F23-BSSE-011 (Admission Year - Program - Roll Number)."
      );
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email.");
      return;
    }

    // Email authentication: must be a valid @gmail.com address
    const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!gmailPattern.test(trimmedEmail)) {
      setError(
        "Please enter a valid Gmail address ending with @gmail.com."
      );
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    // Password authentication: must accept both alphabet and number, with at least 1 uppercase and 1 number
    const hasAlphabet = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);

    if (!hasAlphabet || !hasNumber) {
      setError("Password must contain both alphabet letters and numbers.");
      return;
    }

    if (!hasUpperCase) {
      setError("Password must contain at least one uppercase letter (A-Z).");
      return;
    }

    if (!hasNumber) {
      setError("Password must contain at least one number (0-9).");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/signup",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            full_name: trimmedFullName,
            registration_no: trimmedRegNo,
            email: trimmedEmail.toLowerCase(),
            password: password,
            role: "student",
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.message);
        setLoading(false);
        return;
      }

      setMessage(
        "Account created successfully!"
      );

      setFullName("");
      setRegistrationNo("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (error) {
      console.error(error);

      setError(
        "Unable to connect to the ETIS server. " +
        "Make sure the Python backend is running."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="auth-page"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(16, 44, 36, 0.78) 0%, rgba(9, 25, 20, 0.86) 100%), url(${studyBg})`,
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

        {/* LEFT SIDE */}

        <div
          className="auth-brand"
          style={{
            backgroundImage: `linear-gradient(145deg, rgba(23, 75, 61, 0.90) 0%, rgba(14, 45, 36, 0.95) 100%), url(${examBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >

          <h1>ETIS</h1>

          <p>
            Examination Timetable
            <br />
            Information System
          </p>

        </div>


        {/* RIGHT SIDE */}

        <div className="auth-form-container">

          <h2>Create Account</h2>

          <p className="form-description">
            Create your account to access the ETIS dashboard.
          </p>


          {error && (
            <div className="form-error">
              {error}
            </div>
          )}


          {message && (
            <div className="form-success">
              {message}
            </div>
          )}


          <form onSubmit={handleSignup}>

            {/* FULL NAME */}

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
              />

            </div>


            {/* REGISTRATION NUMBER */}

            <div className="form-group">

              <label htmlFor="registrationNo">
                Registration Number
              </label>

              <input
                id="registrationNo"
                type="text"
                placeholder="e.g. F23-BSSE-011"
                value={registrationNo}
                onChange={(event) =>
                  setRegistrationNo(event.target.value.toUpperCase())
                }
              />
              <small style={{ color: "#686158", fontSize: "12px", marginTop: "5px" }}>
                Format: F23-BSSE-011 (Admission Year - Program - Roll Number)
              </small>

            </div>


            {/* EMAIL */}

            <div className="form-group">

              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your Gmail (e.g. name@gmail.com)"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
              <small style={{ color: "#686158", fontSize: "12px", marginTop: "5px" }}>
                Must be a valid Gmail address (@gmail.com)
              </small>

            </div>


            {/* PASSWORD */}

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
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
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

              <small style={{ color: "#686158", fontSize: "12px", marginTop: "5px" }}>
                Must contain letters &amp; numbers (at least 1 uppercase letter and 1 number)
              </small>

            </div>


            {/* CONFIRM PASSWORD */}

            <div className="form-group">

              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  style={{ paddingRight: "44px" }}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
                  {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

            </div>


            {/* BUTTON */}

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >

              {loading
                ? "Creating Account..."
                : "Create Account"}

            </button>

          </form>


          <div className="auth-footer">

            Already have an account?{" "}

            <Link to="/login">
              Login
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Signup;