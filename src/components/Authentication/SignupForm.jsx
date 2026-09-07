import {
  AuthFooter,
  Divider,
  GoogleButton,
  Input,
  AuthLayout,
} from "../../layouts/AuthLayout";

export function SignupForm() {
  return (
    <AuthLayout>
      <h1>Request platform access</h1>
      <p className="auth-subtitle">
        Accounts are provisioned per response organisation.
      </p>
      <GoogleButton signup />
      <Divider />
      <div className="name-row">
        <Input label="First name" placeholder="Rohan" />
        <Input label="Last name" placeholder="Patil" />
      </div>
      <Input label="Email" placeholder="Name@gmail.com" type="email" />
      <Input label="Organisation" placeholder="Indian Coast Guard — West" />
      <Input
        label="Password"
        placeholder="At least 12 characters"
        type="password"
      />
      <label className="consent">
        <input type="checkbox" />{" "}
        <span>
          I confirm I am authorised to access operational pollution response
          data for my organisation.
        </span>
      </label>
      <button className="submit-button">Create account</button>
      <AuthFooter to="/signin">Already have access?</AuthFooter>
    </AuthLayout>
  );
}
