import { ChevronRight, Download } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";

export function AnalyticsPage() {
	return <Dashboard><ModuleViewHeader eyebrow="INTELLIGENCE / REPORTS" title="Analytics & reports" text="Understand monitoring coverage, response velocity and model performance." action={<button className="module-action"><Download size={16} /> Download report</button>} /><div className="analytics-view-grid"><div className="analytics-hero-card"><small>MONITORING COVERAGE</small><strong>94.8%</strong><span>+4.2% vs previous period</span><svg viewBox="0 0 600 180" preserveAspectRatio="none"><path d="M0 145 C55 125 70 95 125 112 S200 120 245 86 S320 105 365 58 S430 80 470 62 S540 74 600 22" /></svg></div><div className="report-list"><h2>Recent reports</h2>{["Weekly operational brief", "Model accuracy review", "Coastal exposure report"].map((item, index) => <div key={item}><span><Download size={15} /></span><b>{item}<small>{index + 1} day{index ? "s" : ""} ago</small></b><ChevronRight size={15} /></div>)}</div></div></Dashboard>;
}
