import { useState } from "react";
import { Check } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";

export function AlertsPage() {
  const [acknowledged, setAcknowledged] = useState([]);
  const alerts = [
    [
      "Tier 3 active",
      "OSI-2418 forecast shoreline contact inside 15 hours",
      "High",
    ],
    [
      "SAR detection ready",
      "New candidate detected near Gulf of Khambhat",
      "Medium",
    ],
    [
      "Asset status changed",
      "GEOSENCE GF-02 has reached exclusion zone",
      "Low",
    ],
  ];
  function acknowledge(title) {
    setAcknowledged((current) =>
      current.includes(title) ? current : [...current, title],
    );
  }
  return (
    <Dashboard>
      <ModuleViewHeader
        eyebrow="OPERATIONS / ALERTS"
        title="Alerts & notifications"
        text="Stay ahead of the changes that need an operational response."
        action={
          <button
            className="module-action"
            onClick={() => setAcknowledged(alerts.map(([title]) => title))}
          >
            <Check size={16} /> Mark all read
          </button>
        }
      />
      <div className="alert-view-panel">
        {alerts.map(([title, text, level]) => (
          <div
            className={`alert-row ${acknowledged.includes(title) ? "acknowledged" : ""}`}
            key={title}
          >
            <i className={`alert-level ${level.toLowerCase()}`} />
            <div>
              <b>{title}</b>
              <p>{text}</p>
              <small>Today · 06:22 UTC</small>
            </div>
            <button onClick={() => acknowledge(title)}>
              {acknowledged.includes(title) ? "Acknowledged" : "Acknowledge"}
            </button>
          </div>
        ))}
      </div>
    </Dashboard>
  );
}
