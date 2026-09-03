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

  function handleSubmit(event) {
    event.preventDefault();
    if (!email || !password) {
      setError("Enter your work email and password to continue.");
      return;
    }
    setError("");
    setStatus("loading");
    window.setTimeout(() => {
      setStatus("success");
      window.setTimeout(() => navigate("/dashboard"), 500);
    }, 650);
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
        <Input label="Work email" placeholder="name@agency.gov" type="email" value={email} onChange={setEmail} />
        <Input label="Password" placeholder="Enter your password" type="password" value={password} onChange={setPassword} />
        <div className="form-row">
          <label>
            <input type="checkbox" /> Keep me signed in
          </label>
          <Link to="/reset">Forgot password?</Link>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="submit-button" disabled={status === "loading"}>
          {status === "loading" ? <LoaderCircle className="spin" size={18} /> : null}
          {status === "success" ? <Check className="success-check" size={18} /> : status === "loading" ? "Verifying access" : "Sign in"}
        </button>
      </form>
      <AuthFooter to="/signup">Need access?</AuthFooter>
    </AuthLayout>
  );
}
