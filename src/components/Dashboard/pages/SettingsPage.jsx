import { useState } from "react";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";

export function SettingsPage() {
	const [tab, setTab] = useState("Workspace");
	const [enabled, setEnabled] = useState({});
	const preferencesByTab = {
		Workspace: ["Email incident summaries", "Real-time SAR alerts", "Weekly model performance digest"],
		Notifications: ["High-severity incident alerts", "Asset status changes", "Daily operations digest"],
		"Data connections": ["Sentinel-1A feed", "Met-ocean conditions", "Response asset telemetry"],
		Security: ["Require two-factor authentication", "Sign out inactive sessions", "Notify on new device access"],
	};
	const preferences = preferencesByTab[tab];
	return <Dashboard><ModuleViewHeader eyebrow="ACCOUNT / SETTINGS" title="Workspace settings" text="Manage preferences and connections for your command workspace." /><div className="settings-layout"><nav>{["Workspace", "Notifications", "Data connections", "Security"].map(item => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav><div className="settings-panel"><h2>{tab} preferences</h2><p>Configure {tab.toLowerCase()} for your operational team.</p>{preferences.map(item => <button className="settings-toggle" onClick={() => setEnabled({ ...enabled, [item]: !enabled[item] })} key={item}><span>{item}<small>Keep your team informed about important changes.</small></span>{enabled[item] ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}</button>)}</div></div></Dashboard>;
}
