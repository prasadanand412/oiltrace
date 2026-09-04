import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  AuthFooter,
  Divider,
  GoogleButton,
  Input,
  AuthLayout,
} from "../../layouts/AuthLayout";

export function LoginForm() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email || !password) {
      setError("Enter your work email and password to continue.");
      return;
    }

    setError("");
    setStatus("loading");

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(
        "http://localhost:8001/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid email or password.");
      }

      localStorage.setItem("access_token", data.access_token);

      setStatus("success");

      window.setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Unable to sign in. Please try again.");
    }
  }

  return (
    <AuthLayout>
      <h1>Sign in to the console</h1>

      <p className="auth-subtitle">
        Use your agency credentials or continue with Google.
      </p>

      <GoogleButton />

      <Divider />

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Work email"
          placeholder="name@agency.gov"
          type="email"
          value={email}
          onChange={setEmail}
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          type="password"
          value={password}
          onChange={setPassword}
        />

        <div className="form-row">
          <label>
            <input type="checkbox" /> Keep me signed in
          </label>

          <Link to="/reset">Forgot password?</Link>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          className="submit-button"
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <LoaderCircle className="spin" size={18} />
          ) : null}

          {status === "success" ? (
            <Check className="success-check" size={18} />
          ) : status === "loading" ? (
            "Verifying access"
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <AuthFooter to="/signup">Need access?</AuthFooter>
    </AuthLayout>
  );
}