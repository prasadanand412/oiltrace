import {
  BookOpen,
  CircleHelp,
  Cloud,
  Code2,
  Compass,
  Globe2,
  Layers3,
  Radio,
  Satellite,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";

// Shared animation configuration keeps reveal behavior consistent.
export const animationEase = [0.22, 1, 0.36, 1];
export const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.65, ease: animationEase },
};
export const capabilities = [
  [
    Zap,
    "PREDICTION",
    "AI Trajectory Prediction",
    "Neural path planning utilizing historical currents and real-time inputs to model multi-scenario slick spreading.",
  ],
  [
    Globe2,
    "GIS",
    "Interactive Geo-Intelligence",
    "Seamless WebGIS platform featuring rapid vector mapping of ocean fronts, wind vectors, and bathymetry data.",
  ],
  [
    Layers3,
    "LAYERS",
    "Composable Map Layers",
    "Toggle ocean currents, SAR satellites, marine traffic and coastal sensitivity zones in a single unified canvas.",
  ],
  [
    SlidersHorizontal,
    "TIMELINE",
    "Time-Slider Replay",
    "Animate trajectory forecasts forward up to 72 hours, or replay historical release incidents for root-cause audit.",
  ],
  [
    Radio,
    "DATA",
    "Met-Ocean Ingestion",
    "Automated ingestion of global oceanographic data models, wind measurements, and coastal tide stations.",
  ],
  [
    BookOpen,
    "REPORTS",
    "Agency-Ready Reporting",
    "Generate standards-compliant spill dossiers and command briefings featuring trajectory maps in one click.",
  ],
];
export const technology = [
  [
    Code2,
    "React",
    "Drives our high-performance interactive interface using modular components and rapid interactivity patterns.",
  ],
  [
    Globe2,
    "Google Maps API",
    "Powering our WebGIS interface with detailed satellite imagery and custom geospatial overlays.",
  ],
  [
    Sparkles,
    "Machine Learning",
    "Physics-informed ML models running directly on cloud servers to compute drifts within seconds.",
  ],
  [
    Globe2,
    "GIS Integration",
    "Smooth integration of global maritime coordinates, port registries, and marine spatial maps.",
  ],
  [
    Code2,
    "Python Services",
    "Robust data-science scripts executing raw mathematical modeling and oceanographic data fetches.",
  ],
  [
    Cloud,
    "Cloud Architecture",
    "Highly secure and auditable cloud platform, assuring zero downtime during crisis operations.",
  ],
];
export const stats = [
  [
    CircleHelp,
    "12 h",
    "CRITICAL WINDOW",
    "The first 12 hours decide everything",
    "Chemical dispersants and mechanical containment booms lose up to 80% effectiveness once the oil slick emulsifies and fractures under wind-wave action.",
  ],
  [
    Compass,
    "±40 km",
    "TYPICAL DRIFT ERROR",
    "Forecasts stop at the coastline",
    "Standard wind and tidal models often break down in shallow bays and intricate coastal zones, creating enormous margin-of-error drifts.",
  ],
  [
    Waves,
    "8 yrs",
    "HABITAT RECOVERY",
    "Ecological damage compounds",
    "When oil reaches sensitive coastal marine ecosystems like mangrove roots and mudflats, remediation becomes highly intrusive and ecology takes decades to recover.",
  ],
  [
    Zap,
    "6+",
    "DISCONNECTED FEEDS",
    "Data lives in isolated silos",
    "Duty officers must manually cross-reference SAR satellite passes, AIS transponders, wind forecasts and port currents, consuming valuable hours.",
  ],
];
export const journeySteps = [
  [
    "01",
    "STEP 01 · 20 S",
    "Select Location",
    "Click coordinates on map or paste satellite coordinates. System automatically locks nearest port, tide and current sensors.",
  ],
  [
    "02",
    "STEP 02 · 45 S",
    "Enter Spill Data",
    "Specify API gravity, estimated volume released, and wind parameters, or import automated SAR estimate.",
  ],
  [
    "03",
    "STEP 03 · 8 S",
    "Run AI Prediction",
    "Platform’s physics-informed machine learning generates continuous hourly slick positions for the next 72 hours.",
  ],
  [
    "04",
    "STEP 04 · LIVE",
    "Visualize Spread",
    "Monitor multi-scenario projections alongside local coastal vulnerability listings (mangrove, coral reefs, fisheries).",
  ],
  [
    "05",
    "STEP 05 · 1 CLICK",
    "Generate Report",
    "Output a clean, authoritative briefing PDF to coordinate skimmer deployment, boom patterns and emergency personnel.",
  ],
];
export const authFeatures = [
  [Satellite, "SAR passes triaged automatically", "Sentinel-1, RADARSAT-2, PAZ"],
  [Zap, "48-hour ensemble trajectories", "12 members with uncertainty bands"],
  [ShieldCheck, "Sensitivity-weighted risk", "Habitat exposure before landfall"],
];
