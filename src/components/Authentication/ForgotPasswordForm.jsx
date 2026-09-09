import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout, Input } from "../../layouts/AuthLayout";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!email) {
      setError("Enter your email to continue.");
      return;
    }
    setError("");
    setSubmitted(true);
  }

  return (
    <AuthLayout>
      <h1>Reset your password</h1>
      <p className="auth-subtitle">
        Enter your  email and we'll send a secure reset link.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <Input label="Email" placeholder="name@gmail.com" type="email" value={email} onChange={setEmail} />
        {error && <p className="form-error">{error}</p>}
        {submitted && <p className="form-success">Reset link sent. Check your inbox.</p>}
        <button className="submit-button" disabled={submitted}>{submitted ? "Reset link sent" : "Send reset link"}</button>
      </form>
      <p className="reset-note">Reset links expire after 24 hours.</p>
      <p className="auth-foot">
        Remember your password? <Link to="/signin">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
