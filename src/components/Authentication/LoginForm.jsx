import { Link } from "react-router-dom";
import {
  AuthFooter,
  Divider,
  GoogleButton,
  Input,
  AuthLayout,
} from "../../layouts/AuthLayout";

export function LoginForm() {
  return (
    <AuthLayout>
      <h1>Sign in to the console</h1>
      <p className="auth-subtitle">
        Use your agency credentials or continue with Google.
      </p>
      <GoogleButton />
      <Divider />
      <Input label="Work email" placeholder="name@agency.gov" type="email" />
      <Input label="Password" placeholder="••••••••" type="password" />
      <div className="form-row">
        <label>
          <input type="checkbox" /> Keep me signed in
        </label>
        <Link to="/reset">Forgot password?</Link>
      </div>
      <button className="submit-button">Sign in</button>
      <AuthFooter to="/signup">Need access?</AuthFooter>
    </AuthLayout>
  );
}
