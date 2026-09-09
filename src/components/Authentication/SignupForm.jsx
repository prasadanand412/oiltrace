import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AuthFooter,
  Input,
  AuthLayout,
} from "../../layouts/AuthLayout";
import { useAuth } from "../../store/useAuth";
import { getAuthErrorMessage } from "../../utils/auth";

export function SignupForm() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.organisation.trim() ||
      !form.password
    ) {
      setError("Please complete all fields.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }
    if (!form.consent) {
      setError("Please confirm that you are authorised to access the platform.");
      return;
    }
    const name =
      [form.firstName.trim(), form.lastName.trim()].join(" ");
    const email = form.email.trim();
    const organisation = form.organisation.trim();
    setError("");
    setStatus("loading");
    try {
      await signUp({ name, email, organisation, password: form.password });
      setStatus("success");
      navigate("/dashboard");
    } catch (authError) {
      setStatus("idle");
      setError(getAuthErrorMessage(authError));
    }
  }

  return (
    <AuthLayout>
      <h1>Create your account</h1>
      <p className="auth-subtitle">
        Accounts are provisioned per response organisation.
      </p>
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
            I confirm I am authorised to access operational pollution response data for
            my organisation.
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
