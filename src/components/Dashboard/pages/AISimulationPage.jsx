import { useState } from "react";
import { Play, RotateCcw, ToggleLeft, ToggleRight } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";
import { apiRequest } from "../../../services/api";

export function AISimulationPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [sensitiveZones, setSensitiveZones] = useState(true);
  const [values, setValues] = useState({
    volume: 62,
    gravity: 62,
    wind: 62,
    horizon: 62,
  });
  const controls = [
    ["Release volume", "volume", "420 m³"],
    ["API gravity", "gravity", "0.84"],
    ["Wind speed", "wind", "18 knots"],
    ["Forecast horizon", "horizon", "72 hours"],
  ];

  function updateValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function runSimulation() {
    if (running) {
      setRunning(false);
      setResult(null);
      return;
    }
    setError("");
    setRunning(true);
    const latitude = 21.5;
    const longitude = 72.5;
    const hours = Math.max(1, Math.round((Number(values.horizon) / 100) * 72));
    const windSpeed = Math.max(1, Number(values.wind));
    try {
      const [simulation, prediction] = await Promise.all([
        apiRequest("/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude,
            longitude,
            hours,
            particles: 250,
            wind_speed_kmh: windSpeed,
            wind_direction_deg: 90,
            current_speed_kmh: 1,
            current_direction_deg: 90,
            spread_km: 1,
          }),
        }),
        apiRequest("/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude,
            longitude,
            spill_volume_tons: Math.max(1, Number(values.volume) * 10),
            wind_speed_kmh: windSpeed,
            current_speed_kmh: 1,
            distance_to_coast_km: 10,
          }),
        }),
      ]);
      setResult({ simulation, prediction });
    } catch (requestError) {
      setError(requestError.message || "The simulation service could not complete this run.");
      setRunning(false);
    }
  }

  return (
    <Dashboard>
      <ModuleViewHeader
        eyebrow="AI ENGINE / SIMULATION"
        title="Model a possible future"
        text="Set release conditions and watch the ensemble forecast take shape."
        action={
          <button className="module-action" onClick={runSimulation}>
            {running ? <RotateCcw size={16} /> : <Play size={16} />}{" "}
            {running ? "Reset run" : "Run simulation"}
          </button>
        }
      />
      <div className="simulation-layout">
        <div className="control-panel">
          <h2>Simulation setup</h2>
          {controls.map(([label, key, value]) => (
            <label key={key}>
              <span>
                {label}
                <b>{value}</b>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={values[key]}
                onChange={(event) => updateValue(key, event.target.value)}
              />
            </label>
          ))}
          <button
            type="button"
            className="simulation-toggle"
            onClick={() => setSensitiveZones(!sensitiveZones)}
          >
            <span>Include sensitive zones</span>
            {sensitiveZones ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </button>
        </div>
        <div
          className={`simulation-canvas${running ? " is-running" : ""}${sensitiveZones ? "" : " zones-hidden"}`}
        >
          <div className="sim-grid" />
          <span className="sim-source">RELEASE POINT</span>
          <i className="sim-plume" />
          <i className="sim-track" />
          <div className="sim-timeline">
            <span>00h</span>
            <b />
            <span>72h</span>
          </div>
        </div>
        <div className="result-panel">
          <small>ENSEMBLE RESULT</small>
          <strong>
            {result ? result.prediction.risk_score.toFixed(1) : "--"}
            <em>%</em>
          </strong>
          <span>{result ? `${result.prediction.severity} risk score` : "Risk score"}</span>
          <hr />
          <b>{result ? `${result.simulation.particles} particles` : "Ready to run"}</b>
          <p>{error || (result ? `Forecast generated for ${result.simulation.hours} hours.` : "Configure the scenario, then run the model.")}</p>
        </div>
      </div>
    </Dashboard>
  );
}
