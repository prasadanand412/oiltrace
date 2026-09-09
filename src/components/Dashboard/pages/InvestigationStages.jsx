import { Check, Radar, Route, ShipWheel } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInvestigation } from "../../../store/InvestigationContext";

const stages = [
  ["sar", "1", "SAR Detection", "Satellite radar segmentation", Radar, "/dashboard/satellite-radar"],
  ["backtrack", "2", "Particle Backtracking", "Environmental hindcast", Route, "/dashboard/particle-backtracking"],
  ["attribution", "3", "Source Attribution", "AIS candidate ranking", ShipWheel, "/dashboard/source-attribution"],
];

export function InvestigationStages({ active }) {
  const navigate = useNavigate();
  const { stage1Result, backtrackResult } = useInvestigation();
  return (
    <section className="investigation-stages" aria-label="OilTrace investigation stages">
      <div><small>OILTRACE INVESTIGATION</small><b>Connected workflow</b></div>
      <div className="investigation-stage-list">
        {stages.map(([key, number, label, description, Icon, path]) => {
          const complete = key === "sar" ? Boolean(stage1Result) : key === "backtrack" ? Boolean(backtrackResult) : false;
          return (
            <button className={active === key ? "active" : ""} onClick={() => navigate(path)} key={key}>
              <span>{complete ? <Check size={14} /> : number}</span>
              <Icon size={16} />
              <strong>{label}<small>{description}</small></strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
