import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Common/Logo";
import { authFeatures } from "../data/content";

// Auth presentation and form primitives share one layout contract.
export function AuthAside() {
  return (
    <aside className="auth-aside">
      <div className="aside-grid" />
      <div className="aside-content">
        <h2>
          Operational watch across 41
          <br /> coastal districts
        </h2>
        <p>
          OilTrace keeps detection, simulation and response coordination on a single
          incident record — from the first radar return to shoreline sign-off.
        </p>
        <div className="feature-list">
          {authFeatures.map(([Icon, title, text], index) => (
            <motion.div
              className="feature"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 * (index + 1) }}
              key={title}
            >
              <span className="feature-icon">
                <Icon size={21} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </aside>
  );
}
export function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-form-wrap">
        <Logo dark />
        <AnimatePresence mode="wait">
          <motion.div
            className="auth-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      <AuthAside />
    </div>
  );
}
export function Divider() {
  return (
    <div className="divider">
      <span>OR EMAIL</span>
    </div>
  );
}
export function Input({ label, placeholder, type = "text", value, onChange }) {
  return (
    <label className="input-label">
      {label}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}
export function GoogleButton({ onClick, loading = false }) {
  return (
    <button
      className="google-button"
      type="button"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <LoaderCircle className="spin" size={17} /> : <b>G</b>}
      {loading ? "Connecting to Google" : "Continue with Google"}
    </button>
  );
}
export function AuthFooter({ children, to }) {
  return (
    <p className="auth-foot">
      {children}{" "}
      <Link to={to}>{to === "/signup" ? "Create an account" : "Sign in"}</Link>
    </p>
  );
}
