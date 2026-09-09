import { useState } from "react";
import { LoaderCircle, SearchCheck, ShipWheel } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";
import { apiRequest } from "../../../services/api";
import { useInvestigation } from "../../../store/InvestigationContext";
import { InvestigationStages } from "./InvestigationStages";

export function SourceAttributionPage() {
  const { backtrackResult } = useInvestigation();
  const [result, setResult] = useState(null); const [running, setRunning] = useState(false); const [error, setError] = useState("");
  const source = backtrackResult?.estimated_source;
  async function analyze() {
    if (!source) return; setRunning(true); setError("");
    try { setResult(await apiRequest("/attribution", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source_latitude: source.latitude, source_longitude: source.longitude, source_time: source.time, source_area: backtrackResult.geojson, observation_time: backtrackResult.observation_time }) })); }
    catch (requestError) { setError(requestError.message || "Source attribution could not run."); } finally { setRunning(false); }
  }
  return <Dashboard>
    <ModuleViewHeader eyebrow="STAGE 3 / CANDIDATE ANALYSIS" title="Source attribution" text="Correlate the Stage 2 source estimate with available source records. Rankings are leads for investigation, never proof." />
    <InvestigationStages active="attribution" />
    {!source ? <section className="investigation-result attribution-empty"><ShipWheel size={28} /><h2>Stage 2 result required</h2><p>Run particle backtracking first. Its source area and time will be handed here automatically.</p></section> : <div className="attribution-layout">
      <section className="investigation-panel"><small>ESTIMATED SOURCE</small><h2>{source.latitude.toFixed(4)}°, {source.longitude.toFixed(4)}°</h2><p>{new Date(source.time).toLocaleString()} UTC · uncertainty radius {source.uncertainty_radius_km} km</p><p className="investigation-note">The search uses the complete Stage 2 source geometry and time. No coordinates need to be copied.</p><button className="module-action" onClick={analyze} disabled={running}>{running ? <LoaderCircle className="spin" size={16} /> : <SearchCheck size={16} />}{running ? "Searching source records…" : "Run source attribution"}</button>{error && <p className="sar-error">{error}</p>}</section>
      <section className="investigation-result attribution-results"><small>CANDIDATE RANKING</small>{running ? <div className="sar-empty-state"><LoaderCircle className="spin" size={23} /><span>Ranking possible sources…</span></div> : !result ? <div className="sar-empty-state"><ShipWheel size={24} /><span>Run the analysis to query configured source records.</span></div> : <><p className="investigation-note">{result.message}</p><div className="data-status">Vessels: {result.source_catalog_status.vessels} · Platforms: {result.source_catalog_status.platforms} · Natural seeps: {result.source_catalog_status.natural_seeps}</div>{result.candidates.map((candidate) => <article className="candidate-card" key={candidate.mmsi}><div><span>#{candidate.rank} · {candidate.type}</span><h3>{candidate.name}</h3><small>{candidate.vessel_type} · MMSI {candidate.mmsi}</small></div><strong>{candidate.likelihood_score}%<small>likelihood score</small></strong><p>{candidate.distance_km} km · trajectory match: {candidate.trajectory_match}</p><ul>{candidate.evidence.map((item) => <li key={item}>{item}</li>)}</ul></article>)}{result.candidates.length === 0 && <p className="investigation-note">{result.limitations}</p>}</>}</section>
    </div>}
  </Dashboard>;
}
