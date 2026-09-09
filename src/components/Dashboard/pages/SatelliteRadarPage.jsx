import { useState } from "react";
import { Download } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";

export function SatelliteRadarPage() {
  const [compare, setCompare] = useState(50);
  return (
    <Dashboard>
      <ModuleViewHeader
        eyebrow="REMOTE SENSING / SAR"
        title="Satellite radar review"
        text="Compare detections across passes and validate the latest slick estimate."
        action={
          <button className="module-action">
            <Download size={16} /> Export scene
          </button>
        }
      />
      <div className="sar-layout">
        <div className="sar-viewer">
          <div className="sar-before" style={{ width: `${compare}%` }} />
          <div className="sar-after" />
          <div className="sar-divider" style={{ left: `${compare}%` }}>
            <span />
          </div>
          <input
            className="sar-slider"
            type="range"
            min="10"
            max="90"
            value={compare}
            onChange={(event) => setCompare(event.target.value)}
            aria-label="Compare raw and detected satellite scene"
          />
          <label>
            RAW PASS <b>DETECTED EXTENT</b>
          </label>
        </div>
        <div className="sar-meta">
          <small>SCENE METADATA</small>
          <h2>Sentinel-1A</h2>
          {[
            ["Pass time", "25 Aug 2026 · 06:02 UTC"],
            ["Orbit", "Ascending · 128 km"],
            ["Resolution", "10 m · IW mode"],
            ["Detection", "4.1 km² extent"],
          ].map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>
      </div>
    </Dashboard>
  );
}
