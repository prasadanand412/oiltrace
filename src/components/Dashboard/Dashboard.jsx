import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ModuleWorkspace } from "./ModuleWorkspace";
import {
  Activity,
  Archive,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  Clock3,
  Leaf,
  LayoutDashboard,
  Map,
  Menu,
  Navigation,
  Plus,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Waves,
  Workflow,
  UserRound,
} from "lucide-react";

const navigation = [
  [LayoutDashboard, "Dashboard", "/dashboard"],
  [Boxes, "Core Features", "/dashboard/core-features"],
  [Sparkles, "AI Simulation", "/dashboard/ai-simulation"],
  [Map, "GIS Command Map", "/dashboard/gis-command-map"],
  [Workflow, "Incident Workflow", "/dashboard/incident-workflow"],
  [Radar, "Satellite Radar SAR", "/dashboard/satellite-radar"],
  [Leaf, "Sensitive Coastal Zones", "/dashboard/sensitive-zones"],
  [Archive, "Historical Archives", "/dashboard/historical-archives"],
  [Activity, "Analytics & Reports", "/dashboard/analytics"],
  [Bell, "Alerts & Notifications", "/dashboard/alerts"],
];
const kpis = [
  ["ACTIVE INCIDENTS", "6", "+2 vs 24h", "blue"],
  ["AREA UNDER SLICK", "71.0", "+9.4 km²", "blue", "km²"],
  ["RECOVERED VOLUME", "812", "+142 m³", "blue", "m³"],
  ["ASSETS ON STATION", "18", "4 en route", "neutral"],
  ["MEAN AI CONFIDENCE", "89", "+3 pts", "blue", "%"],
  ["SHORELINE AT RISK", "26", "-4 km", "green", "km"],
];
const incidents = [
  ["OSI-2418", "Gulf of Khambhat", "2h 14m ago", "High", "#dc2626"],
  ["OSI-2417", "Chennai coast", "5h 32m ago", "Moderate", "#d97706"],
  ["OSI-2412", "Sundarbans delta", "Yesterday", "Contained", "#16a34a"],
];
const searchResults = [
  ["Dashboard", "Workspace overview", "/dashboard"],
  ["Core Features", "Platform modules", "/dashboard/core-features"],
  ["AI Simulation", "Forecast modeling", "/dashboard/ai-simulation"],
  ["GIS Command Map", "Live map layers", "/dashboard/gis-command-map"],
  ["Incident Workflow", "Response coordination", "/dashboard/incident-workflow"],
  ["Satellite Radar SAR", "Remote sensing passes", "/dashboard/satellite-radar"],
  ["Sensitive Coastal Zones", "Environmental exposure", "/dashboard/sensitive-zones"],
  ["Historical Archives", "Incident records", "/dashboard/historical-archives"],
  ["Analytics & Reports", "Coverage and trends", "/dashboard/analytics"],
  ["Alerts & Notifications", "Operational alerts", "/dashboard/alerts"],
  ["OSI-2418", "Gulf of Khambhat · High", "/dashboard/incident-workflow"],
  ["OSI-2417", "Chennai coast · Moderate", "/dashboard/incident-workflow"],
  ["Weekly operational brief", "Recent report", "/dashboard/analytics"],
];

function KpiCard({ item, index }) {
  const [label, value, change, tone, unit] = item;
  return (
    <motion.article className="dash-kpi" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.4 }}>
      <small>{label}</small>
      <strong>{value}<em>{unit}</em></strong>
      <span className={`kpi-change ${tone}`}>{change}</span>
    </motion.article>
  );
}

export function Dashboard({ module = "Dashboard" }) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const suggestions = query.trim() ? searchResults.filter(([title, detail]) => `${title} ${detail}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];

  function openSearchResult(path) {
    setQuery("");
    navigate(path);
  }
  return (
    <div className={`dashboard-page${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" to="/dashboard"><span><Waves size={25} /></span><b>OilTrace</b><small>SPILL INTELLIGENCE</small></Link>
        <div className="sidebar-label">OPERATIONS</div>
        <nav>{navigation.map(([Icon, label, path]) => <Link className={location.pathname === path ? "active" : ""} to={path} key={label}><Icon size={18} /><span>{label}</span></Link>)}</nav>
        <div className="watch-status"><small>WATCH STATUS</small><b><i /> All feeds nominal</b><span>Next SAR pass 09:42 UTC · Sentinel-1A</span></div>
        <div className="sidebar-account-links"><Link className={location.pathname === "/dashboard/settings" ? "active" : ""} to="/dashboard/settings"><Settings size={16} /><span>Settings</span></Link><Link className={location.pathname === "/dashboard/profile" ? "active" : ""} to="/dashboard/profile"><UserRound size={16} /><span>Profile</span></Link></div>
      </aside>
      <main className="dashboard-content">
        <header className="dashboard-topbar">
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar"><Menu size={19} /></button>
          <div className="dashboard-search-wrap"><div className="dashboard-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incidents, vessels, zones, coordinates..." /></div>{suggestions.length > 0 && <div className="search-suggestions">{suggestions.map(([title, detail, path]) => <button onClick={() => openSearchResult(path)} key={`${title}-${path}`}><Search size={14} /><span><b>{title}</b><small>{detail}</small></span><ChevronDown size={14} /></button>)}</div>}</div>
          <div className="dashboard-date"><CalendarDays size={16} /> 25 Aug 2026 · 06:58 UTC</div>
          <span className="alert-badge"><i /> Tier 3 active</span>
          <button className="notification-button" onClick={() => navigate("/dashboard/alerts")} aria-label="Notifications"><Bell size={19} /><i /></button>
          <button className="profile" onClick={() => navigate("/dashboard/profile")} aria-label="Open profile"><span>RI</span><div><b>R. Iyer</b><small>Incident Commander</small></div><ChevronDown size={16} /></button>
        </header>
        <div className="dashboard-inner">
          {module === "Dashboard" ? <>
          <motion.div className="dashboard-heading" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
            <div><small>OPERATIONAL WATCH · WEST & EAST COAST</small><h1>Incident overview</h1><p>Six incidents under management. OSI-2418 remains the controlling event with forecast shoreline contact inside 15 hours.</p></div>
            <div className="heading-actions"><button onClick={() => navigate("/dashboard/gis-command-map")}><Navigation size={17} /> Command map</button><button className="primary-action" onClick={() => navigate("/dashboard/ai-simulation")}><Plus size={18} /> New simulation</button></div>
          </motion.div>
          <div className="dash-kpi-grid">{kpis.map((item, index) => <KpiCard item={item} index={index} key={item[0]} />)}</div>
          <div className="dashboard-grid">
            <section className="dashboard-card map-card"><div className="card-header"><div><h2>Maritime monitoring — Gulf of Khambhat</h2><p>Sentinel-1A 06:02 UTC · slick extent, forecast track and response assets</p></div><span className="live-pill">Live</span></div><div className="command-map"><div className="coastline" /><div className="slick-blob" /><div className="forecast-line" /><i className="map-marker marker-one" /><i className="map-marker marker-two" /><i className="map-marker marker-three" /><span className="asset-label label-one">GEOSENCE GF-02<small>Exclusion · 4.1 km²</small></span><div className="map-scale">0&nbsp;&nbsp;&nbsp; 5&nbsp;&nbsp;&nbsp; 10 km</div></div><div className="map-footer"><span><i className="legend-slick" /> Slick extent</span><span><i className="legend-forecast" /> Forecast track</span><span><i className="legend-assets" /> Response assets</span><b><Clock3 size={14} /> Updated 06:22 UTC</b></div></section>
            <section className="dashboard-card risk-card"><div className="card-header"><div><h2>AI risk assessment</h2><p>Ensemble v4.2 · 12 members · updated 06:22 UTC</p></div><ShieldCheck className="risk-icon" size={22} /></div><div className="risk-list"><RiskBar label="Shoreline contact probability" place="Hazira / Suvali stretch" value={78} color="red" /><RiskBar label="Ecological sensitivity exposure" place="Mangrove priority zone" value={64} color="amber" /><RiskBar label="Response window remaining" place="Recommended action window" value={42} color="blue" /></div><div className="risk-footer"><span>Overall risk index</span><strong>HIGH <small>78/100</small></strong></div></section>
          </div>
          <div className="dashboard-grid lower-grid"><section className="dashboard-card incidents-card"><div className="card-header"><div><h2>Recent incidents</h2><p>Latest changes across your operational watch</p></div><button className="card-link" onClick={() => navigate("/dashboard/incident-workflow")}>View all</button></div>{incidents.map(([id, place, time, severity, color]) => <button className="incident-row" onClick={() => navigate("/dashboard/incident-workflow")} key={id}><span className="incident-dot" style={{ background: color }} /><div><b>{id} · {place}</b><small>{time}</small></div><em style={{ color }}>{severity}</em></button>)}</section><section className="dashboard-card analytics-card"><div className="card-header"><div><h2>Coverage analytics</h2><p>Monitoring footprint · last 7 days</p></div><button className="select-button" onClick={() => navigate("/dashboard/analytics")}>7 days <ChevronDown size={14} /></button></div><div className="chart-value"><strong>94.8%</strong><span><Activity size={13} /> +4.2%</span></div><svg className="analytics-chart" viewBox="0 0 560 120" preserveAspectRatio="none"><path d="M0 93 C45 84 52 62 94 71 S145 82 180 54 S235 77 275 45 S330 54 362 26 S420 44 454 30 S510 42 560 10" /><path className="chart-area" d="M0 93 C45 84 52 62 94 71 S145 82 180 54 S235 77 275 45 S330 54 362 26 S420 44 454 30 S510 42 560 10 V120 H0Z" /></svg></section></div>
          </> : <ModuleWorkspace module={module} />}
        </div>
      </main>
    </div>
  );
}

function RiskBar({ label, place, value, color }) {
  return <div className="risk-row"><div><b>{label}</b><strong>{value}%</strong></div><div className={`risk-track ${color}`}><motion.span initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: .8, ease: [0.22, 1, 0.36, 1] }} /></div><small>{place}</small></div>;
}
