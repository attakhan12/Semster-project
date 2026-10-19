import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); 

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!registrationNo.trim()) {
      setError("Please enter your registration number.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
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
            full_name: fullName,
            registration_no: registrationNo,
            email: email,
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
    <div className="auth-page">

      <div className="auth-card">

        {/* LEFT SIDE */}

        <div className="auth-brand">

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
                placeholder="Enter your registration number"
                value={registrationNo}
                onChange={(event) =>
                  setRegistrationNo(event.target.value)
                }
              />

            </div>


            {/* EMAIL */}

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
              />

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />

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