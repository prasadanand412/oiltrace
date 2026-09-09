import { Link } from "react-router-dom";
import { Logo } from "../Common/Logo";

export function Resources() {
  return (
    <footer id="resources">
      <div className="footer-main">
        <div>
          <Logo dark />
          <p>
            AI powered oil spill monitoring and simulation for coastal
            authorities, port trusts and environmental response teams.
          </p>
        </div>
        <div>
          <b>PLATFORM</b>
          <a href="#overview">Overview</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#journey">Simulation Journey</a>
          <a href="/signin">Dashboard</a>
        </div>
        <div>
          <b>RESOURCES</b>
          <a href="#technology">Documentation</a>
          <a href="#technology">Model methodology</a>
          <a href="https://github.com">GitHub</a>
          <a href="#contact">Changelog</a>
        </div>
        <div>
          <b>COMPANY</b>
          <a href="#contact">Contact</a>
          <a href="#contact">Privacy</a>
          <a href="#contact">Terms</a>
          <a href="#contact">Security</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 OilTrace. Built for Smart India Hackathon.</span>
        <span>
          <Link to="/signin">Sign In</Link>
          <Link to="/signin">Start Simulation</Link>
        </span>
      </div>
    </footer>
  );
}
