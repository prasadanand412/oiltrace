import { useState } from "react";
import { Play, RotateCcw, ToggleLeft, ToggleRight } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";

export function AISimulationPage() {
  const [running, setRunning] = useState(false);
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

  return (
    <Dashboard>
      <ModuleViewHeader
        eyebrow="AI ENGINE / SIMULATION"
        title="Model a possible future"
        text="Set release conditions and watch the ensemble forecast take shape."
        action={
          <button className="module-action" onClick={() => setRunning(!running)}>
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
            {running ? "94.8" : "--"}
            <em>%</em>
          </strong>
          <span>Confidence score</span>
          <hr />
          <b>12 members</b>
          <p>Forecast uncertainty narrows after the first 18 hours.</p>
        </div>
      </div>
    </Dashboard>
  );
}
