import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AuthFooter,
  Input,
  AuthLayout,
} from "../../layouts/AuthLayout";
import { useAuth } from "../../store/useAuth";
import { getAuthErrorMessage } from "../../utils/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [status, setStatus] = useState("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);
  const timers = useRef([]);

  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  function handleSubmit(event) {
    event.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }
    setError("");
    setStatus("loading");
    void signIn({ email, password, remember })
      .then(() => {
        setStatus("success");
        timers.current.push(
          window.setTimeout(
            () => navigate(location.state?.from?.pathname ?? "/dashboard"),
            500,
          ),
        );
      })
      .catch((authError) => {
        setStatus("idle");
        setError(getAuthErrorMessage(authError));
      });
  }

  return (
    <AuthLayout>
      <h1>Sign in to the console</h1>
      <p className="auth-subtitle">
        Use your OilTrace account credentials to continue.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          placeholder="Name@gmail.com"
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
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />{" "}
            Keep me signed in
          </label>
          <Link to="/reset">Forgot password?</Link>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="submit-button" disabled={status === "loading"}>
          {status === "loading" ? <LoaderCircle className="spin" size={18} /> : null}
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
