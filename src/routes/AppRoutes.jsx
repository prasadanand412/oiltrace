import { Route, Routes, useLocation } from "react-router-dom";
import { ForgotPasswordForm } from "../components/Authentication/ForgotPasswordForm";
import { LandingPage } from "../components/Landing/LandingPage";
import { LoginForm } from "../components/Authentication/LoginForm";
import { SignupForm } from "../components/Authentication/SignupForm";

// Keep route definitions centralized so pages remain composable.
export function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<LoginForm />} />
      <Route path="/signup" element={<SignupForm />} />
      <Route path="/reset" element={<ForgotPasswordForm />} />
    </Routes>
  );
}
