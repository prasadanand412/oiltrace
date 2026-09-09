import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AuthFooter,
  Divider,
  GoogleButton,
  Input,
  AuthLayout,
} from "../../layouts/AuthLayout";
import { useAuth } from "../../store/useAuth";

export function SignupForm() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    organisation: "",
    password: "",
    consent: false,
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const name =
      [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") ||
      "OilTrace User";
    const email = form.email.trim() || "user@oiltrace.local";
    const organisation = form.organisation.trim() || "OilTrace Operations";
    signUp({ name, email, organisation });
    setStatus("success");
    navigate("/dashboard");
  }

  function handleGoogleSignup() {
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
      <h1>Create your account</h1>
      <p className="auth-subtitle">
        Accounts are provisioned per response organisation.
      </p>
      <GoogleButton
        onClick={handleGoogleSignup}
        loading={status === "loading"}
      />
      <Divider />
      <form onSubmit={handleSubmit} noValidate>
        <div className="name-row">
          <Input
            label="First name"
            placeholder="Rohan"
            value={form.firstName}
            onChange={(value) => update("firstName", value)}
          />
          <Input
            label="Last name"
            placeholder="Patil"
            value={form.lastName}
            onChange={(value) => update("lastName", value)}
          />
        </div>
        <Input
          label="Email"
          placeholder="Name@gmail.com"
          type="email"
          value={form.email}
          onChange={(value) => update("email", value)}
        />
        <Input
          label="Organisation"
          placeholder="Indian Coast Guard — West"
          value={form.organisation}
          onChange={(value) => update("organisation", value)}
        />
        <Input
          label="Password"
          placeholder="At least 12 characters"
          type="password"
          value={form.password}
          onChange={(value) => update("password", value)}
        />
        <label className="consent">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(event) => update("consent", event.target.checked)}
          />{" "}
          <span>
            I confirm I am authorised to access operational pollution response
            data for my organisation.
          </span>
        </label>
        {error && <p className="form-error">{error}</p>}
        {status === "success" && (
          <p className="form-success">Account created successfully.</p>
        )}
        <button className="submit-button" disabled={status === "success"}>
          {status === "success" ? "Account created" : "Create account"}
        </button>
      </form>
      <AuthFooter to="/signin">Already have access?</AuthFooter>
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
