import { Waves } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo({ dark = false }) {
  return (
    <Link to="/" className={`logo ${dark ? "logo-dark" : ""}`}>
      <span className="logo-mark">
        <Waves size={20} />
      </span>
      <span>
        <strong>OilTrace</strong>
        <small>SPILL INTELLIGENCE</small>
      </span>
    </Link>
  );
}
