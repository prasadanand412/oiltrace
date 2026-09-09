import { motion } from "framer-motion";
import { Check, Upload } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const steps = [["Detection triaged", "Sentinel-1A pass verified", true], ["Incident classified", "Severity assigned by duty officer", true], ["Response deployed", "Boom team en route to Hazira", true], ["Shoreline sign-off", "Awaiting field confirmation", false]];

export function IncidentWorkflowPage() {
	return <Dashboard><ModuleViewHeader eyebrow="OPERATIONS / WORKFLOW" title="Incident response workflow" text="Track ownership and operational progress from detection to closure." action={<button className="module-action"><Upload size={16} /> Export brief</button>} /><div className="workflow-panel">{steps.map(([title, text, done], index) => <motion.div className={`workflow-step${done ? " done" : ""}`} {...fade} transition={{ delay: index * 0.1, duration: 0.4 }} key={title}><div className="workflow-node">{done ? <Check size={15} /> : index + 1}</div><div><small>STEP 0{index + 1}</small><h2>{title}</h2><p>{text}</p></div><span>{done ? "Complete" : "In progress"}</span></motion.div>)}</div></Dashboard>;
}
