import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AuthFooter,
  Divider,
  GoogleButton,
  Input,
  AuthLayout,
} from "../../layouts/AuthLayout";
import { useAuth } from "../../store/useAuth";

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle } = useAuth();
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
    timers.current.push(
      window.setTimeout(() => {
        const authenticated = signIn({ email, remember });
        if (!authenticated) {
          setStatus("idle");
          setError("Account not found. Create an account before signing in.");
          return;
        }
        setStatus("success");
        timers.current.push(
          window.setTimeout(
            () => navigate(location.state?.from?.pathname ?? "/dashboard"),
            500,
          ),
        );
      }, 650),
    );
  }

  function handleGoogleLogin() {
    setError("");
    setStatus("loading");
    signInWithGoogle()
      .then(() => navigate("/dashboard"))
      .catch((authError) => {
        setStatus("idle");
        setError(getAuthErrorMessage(authError));
      });
  }

  return (
    <AuthLayout>
      <h1>Sign in to the console</h1>
      <p className="auth-subtitle">
        Use your agency credentials or continue with Google.
      </p>
      <GoogleButton
        onClick={handleGoogleLogin}
        loading={status === "loading"}
      />
      <Divider />
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

function getAuthErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user")
    return "Google sign-in was cancelled.";
  if (error?.code === "auth/popup-blocked")
    return "Your browser blocked the Google sign-in popup.";
  if (error?.code === "auth/network-request-failed")
    return "Network error. Check your connection and try again.";
  return error?.message || "Google sign-in failed. Please try again.";
}
