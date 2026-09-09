import { useState } from "react";
import { ArrowRight, LoaderCircle, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";
import { apiRequest } from "../../../services/api";
import { useInvestigation } from "../../../store/InvestigationContext";
import { InvestigationStages } from "./InvestigationStages";

const utcNow = () => new Date().toISOString().slice(0, 16);

function coordinateLabel(value, direction) {
  return `${Math.abs(Number(value)).toFixed(4)}° ${direction}`;
}

export function ParticleBacktrackingPage() {
  const navigate = useNavigate();
  const { backtrackResult, setBacktrackResult } = useInvestigation();
  const [values, setValues] = useState({ time: utcNow(), latitude: "", longitude: "", latitude_direction: "N", longitude_direction: "E" });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  function change(event) { setValues((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function runBacktracking(event) {
    event.preventDefault();
    const latitude = Number(values.latitude);
    const longitude = Number(values.longitude);
    if (!Number.isFinite(latitude) || latitude < 0 || latitude > 90 || !Number.isFinite(longitude) || longitude < 0 || longitude > 180) {
      setError("Enter latitude from 0–90 and longitude from 0–180, then choose their hemispheres.");
      return;
    }
    setError(""); setRunning(true);
    try {
      const result = await apiRequest("/backtrack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, latitude, longitude, time: `${values.time}:00Z` }) });
      setBacktrackResult(result);
    } catch (requestError) { setError(requestError.message || "Particle backtracking could not run."); }
    finally { setRunning(false); }
  }
  const source = backtrackResult?.estimated_source;
  return (
    <Dashboard>
      <ModuleViewHeader eyebrow="STAGE 2 / ENVIRONMENTAL HINDCAST" title="Particle backtracking" text="Trace the detected slick backward through current wind and ocean-current conditions. Time is interpreted as UTC." />
      <InvestigationStages active="backtrack" />
      <div className="investigation-layout">
        <form className="investigation-panel" onSubmit={runBacktracking}>
          <small>OBSERVED SLICK</small><h2>Set detection coordinates</h2>
          <label>Detection time (UTC)<input type="datetime-local" name="time" value={values.time} onChange={change} required /></label>
          <div className="coordinate-grid">
            <label>Latitude<input type="number" name="latitude" min="0" max="90" step="0.0001" value={values.latitude} onChange={change} placeholder="18.5204" required /></label>
            <label>Hemisphere<select name="latitude_direction" value={values.latitude_direction} onChange={change}><option>N</option><option>S</option></select></label>
            <label>Longitude<input type="number" name="longitude" min="0" max="180" step="0.0001" value={values.longitude} onChange={change} placeholder="73.8567" required /></label>
            <label>Hemisphere<select name="longitude_direction" value={values.longitude_direction} onChange={change}><option>E</option><option>W</option></select></label>
          </div>
          <p className="investigation-note">N/S and E/W determine the sign; do not enter a negative decimal value.</p>
          {error && <p className="sar-error">{error}</p>}
          <button className="module-action" disabled={running}>{running ? <LoaderCircle className="spin" size={16} /> : <Route size={16} />}{running ? "Fetching environmental data…" : "Run particle backtracking"}</button>
        </form>
        <section className="investigation-result">
          <small>BACKTRACKING RESULT</small>
          {running ? <div className="sar-empty-state"><LoaderCircle className="spin" size={23} /><span>Calculating source region…</span></div> : !backtrackResult ? <div className="sar-empty-state"><Route size={24} /><span>Enter the UTC observation and coordinates to estimate the probable source area.</span></div> : <>
            <div className="source-summary"><span>Estimated source</span><b>{coordinateLabel(source.latitude, source.latitude >= 0 ? "N" : "S")}, {coordinateLabel(source.longitude, source.longitude >= 0 ? "E" : "W")}</b><small>{new Date(source.time).toLocaleString()} UTC · ± {source.uncertainty_radius_km} km</small></div>
            <TrajectoryGraphic trajectory={backtrackResult.trajectory} />
            <div className="result-details"><span>{backtrackResult.duration_hours} h hindcast · {backtrackResult.steps} steps</span><span>Wind {backtrackResult.environment_used.wind_speed_10m_kmh} km/h · Current {backtrackResult.environment_used.ocean_current_velocity_kmh} km/h</span></div>
            <p className="investigation-note">{backtrackResult.method}. {backtrackResult.limitations}</p>
            <button className="module-action" onClick={() => navigate("/dashboard/source-attribution")}>Continue to source attribution <ArrowRight size={16} /></button>
          </>}
        </section>
      </div>
    </Dashboard>
  );
}

function TrajectoryGraphic({ trajectory }) {
  const lats = trajectory.map((point) => point.latitude); const lons = trajectory.map((point) => point.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const spreadLat = Math.max(maxLat - minLat, 0.001), spreadLon = Math.max(maxLon - minLon, 0.001);
  const points = trajectory.map((point) => `${20 + ((point.longitude - minLon) / spreadLon) * 260},${150 - ((point.latitude - minLat) / spreadLat) * 110}`).join(" ");
  return <div className="trajectory-graphic"><div><b>Observed slick</b><span>← Earlier source estimate</span></div><svg viewBox="0 0 300 170" role="img" aria-label="Schematic backtracking trajectory"><polyline points={points} /><circle cx={points.split(" ")[0].split(",")[0]} cy={points.split(" ")[0].split(",")[1]} r="6" /><circle cx={points.split(" ").at(-1).split(",")[0]} cy={points.split(" ").at(-1).split(",")[1]} r="9" /></svg><small>Geographic trajectory schematic, not a navigable GIS map.</small></div>;
}
