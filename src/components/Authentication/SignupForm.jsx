import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  AuthFooter,
  Divider,
  GoogleButton,
  Input,
  AuthLayout,
} from "../../layouts/AuthLayout";

export function SignupForm() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!firstName || !lastName || !email || !organisation || !password) {
      setError("Please complete all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (!consent) {
      setError("Please confirm that you are authorised to access the platform.");
      return;
    }

    setError("");
    setStatus("loading");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to create account.");
      }

      setStatus("success");

      window.setTimeout(() => {
        navigate("/signin");
      }, 700);
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Unable to create account.");
    }
  }

  return (
    <AuthLayout>
      <h1>Request platform access</h1>

      <p className="auth-subtitle">
        Accounts are provisioned per response organisation.
      </p>

      <GoogleButton signup />

      <Divider />

      <form onSubmit={handleSubmit} noValidate>
        <div className="name-row">
          <Input
            label="First name"
            placeholder="Rohan"
            value={firstName}
            onChange={setFirstName}
          />

          <Input
            label="Last name"
            placeholder="Iyer"
            value={lastName}
            onChange={setLastName}
          />
        </div>

        <Input
          label="Work email"
          placeholder="name@agency.gov"
          type="email"
          value={email}
          onChange={setEmail}
        />

        <Input
          label="Organisation"
          placeholder="Indian Coast Guard — West"
          value={organisation}
          onChange={setOrganisation}
        />

        <Input
          label="Password"
          placeholder="At least 12 characters"
          type="password"
          value={password}
          onChange={setPassword}
        />

        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />{" "}
          <span>
            I confirm I am authorised to access operational pollution response
            data for my organisation.
          </span>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button
          type="submit"
          className="submit-button"
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <LoaderCircle className="spin" size={18} />
          ) : null}

          {status === "success" ? (
            <Check className="success-check" size={18} />
          ) : status === "loading" ? (
            "Creating account"
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <AuthFooter to="/signin">Already have access?</AuthFooter>
    </AuthLayout>
  );
}