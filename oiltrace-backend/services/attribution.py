"""Stage 3 data-source adapter and transparent candidate presentation."""

from __future__ import annotations

import os
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
# Docker copies the reusable ML modules under the active backend at /app/ml;
# locally they remain at the repository root. Support both layouts.
REPOSITORY_ROOT = BACKEND_ROOT.parent
ML_IMPORT_ROOT = BACKEND_ROOT if (BACKEND_ROOT / "ml" / "attribution").is_dir() else REPOSITORY_ROOT
if str(ML_IMPORT_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_IMPORT_ROOT))


def _candidate_evidence(candidate: dict) -> list[str]:
    evidence = [f"Closest AIS report was {candidate['closest_distance_km']:.1f} km from the estimated source."]
    if candidate.get("trajectory_score", 0) >= 0.6:
        evidence.append("Reported course is consistent with approaching the estimated source area.")
    if candidate.get("anomaly_score", 0) >= 0.35:
        evidence.append("AIS behaviour near the source-time window contributed an anomaly signal.")
    if candidate.get("vessel_type") in {"tanker", "cargo"}:
        evidence.append(f"Vessel class ({candidate['vessel_type']}) is included as a limited prior, not proof.")
    return evidence


def analyze_sources(*, latitude: float, longitude: float, source_time, source_area=None) -> dict:
    """Rank a configured historical AIS feed; never substitute fabricated ships."""
    configured_path = os.getenv("OILTRACE_AIS_DATA_PATH")
    baseline = {
        "method": "Explainable AIS candidate ranking; not causal proof or an ML classifier.",
        "estimated_source": {"latitude": latitude, "longitude": longitude, "time": source_time.isoformat(), "area": source_area},
        "source_catalog_status": {
            "vessels": "unavailable",
            "platforms": "unavailable",
            "natural_seeps": "unavailable",
        },
        "candidates": [],
        "message": "No vessel data available for this area/time. Configure OILTRACE_AIS_DATA_PATH with a real historical AIS CSV to run vessel attribution.",
        "limitations": "No platform or natural-seep catalogue is configured, so those source types are not ranked.",
    }
    if not configured_path:
        return baseline

    ais_path = Path(configured_path).expanduser()
    if not ais_path.is_file():
        baseline["message"] = "AIS data path is configured but the CSV is not accessible to the backend. No vessel candidates were produced."
        return baseline

    try:
        from ml.attribution.attribution import rank_vessels

        candidates = rank_vessels(
            ais_path,
            origin_lon=longitude,
            origin_lat=latitude,
            time_window_start=source_time,
            time_window_end=source_time,
            max_results=20,
        )
    except (ImportError, OSError, ValueError) as exc:
        baseline["message"] = f"AIS data could not be analyzed: {exc}"
        return baseline

    formatted = []
    for candidate in candidates:
        formatted.append(
            {
                "rank": candidate["rank"],
                "name": candidate.get("VesselName") or f"MMSI {candidate.get('MMSI', 'unknown')}",
                "mmsi": candidate.get("MMSI"),
                "type": "ship",
                "vessel_type": candidate.get("vessel_type"),
                "likelihood_score": round(candidate["combined_score"] * 100, 1),
                "distance_km": candidate["closest_distance_km"],
                "closest_approach_time": candidate["closest_approach_time"],
                "trajectory_match": "high" if candidate["trajectory_score"] >= 0.67 else "medium" if candidate["trajectory_score"] >= 0.34 else "low",
                "evidence": _candidate_evidence(candidate),
                "score_breakdown": {
                    "proximity": candidate["proximity_score"],
                    "trajectory": candidate["trajectory_score"],
                    "ais_behaviour": candidate["anomaly_score"],
                    "vessel_type_prior": candidate["vessel_type_score"],
                },
            }
        )
    return {
        **baseline,
        "source_catalog_status": {**baseline["source_catalog_status"], "vessels": "configured historical AIS CSV"},
        "candidates": formatted,
        "message": "Candidate ranking is based on historical AIS correlation and is not an attribution of responsibility." if formatted else "No vessel data available for this area/time.",
    }
