import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "../Common/Logo";
import { useMobileMenu } from "../../hooks/useMobileMenu";

// Navigation state is isolated in the mobile menu hook.
export function Header() {
  const { open, close, toggle } = useMobileMenu();
  return (
    <header className="site-header">
      <Logo />
      <nav className={open ? "nav-open" : ""}>
        <a href="#overview" onClick={close}>
          Overview
        </a>
        <a href="#capabilities" onClick={close}>
          Capabilities
        </a>
        <a href="#journey" onClick={close}>
          Simulation Journey
        </a>
        <a href="#technology" onClick={close}>
          Technology
        </a>
        <a href="#resources" onClick={close}>
          Resources
        </a>
        <a href="#contact" onClick={close}>
          Contact
        </a>
      </nav>
      <div className="header-actions">
        <Link className="signin-link" to="/signin">
          Sign In
        </Link>
        <Link className="button button-blue button-small" to="/signin">
          Launch Platform
        </Link>
      </div>
      <button className="menu-button" onClick={toggle} aria-label="Toggle menu">
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
