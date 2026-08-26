import { Link } from "react-router-dom";
import { AuthLayout, Input } from "../../layouts/AuthLayout";

export function ForgotPasswordForm() {
  return (
    <AuthLayout>
      <h1>Reset your password</h1>
      <p className="auth-subtitle">
        Enter your work email and we'll send a secure reset link.
      </p>
      <Input label="Work email" placeholder="name@agency.gov" type="email" />
      <button className="submit-button">Send reset link</button>
      <p className="reset-note">Reset links expire after 24 hours.</p>
      <p className="auth-foot">
        Remember your password? <Link to="/signin">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
