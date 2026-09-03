"""End-to-end OilTrace pipeline (SIH 2026, PS SIH26143) - all three stages.

Chains the stage entry points into one call, passing each stage's output into
the next:

    Stage 1  detection.model.predict_oil_spill   image -> oil mask + stats
    Stage 2  drift_trace.model.trace_origin      mask location/time -> origin
             estimate + origin time window (real wind via get_current_wind,
             real currents via the Copernicus netCDF file)
    Stage 3  attribution.attribution.rank_vessels  origin + window -> ranked
             suspect vessels from AIS data

The origin time window handed to Stage 3 is exactly the one Stage 2 produces
(origin_window_start / origin_window_end) - it is never recomputed here.

    from pipeline import run_full_pipeline

    result = run_full_pipeline(
        image_path="detection/data/test/sentinel/image/0.png",
        detection_lon=51.5, detection_lat=26.5,
        detection_time="2026-08-27T12:00:00",
        ais_data_path="attribution/data/synthetic_ais_persian_gulf.csv",
    )
    result["detection"], result["drift_trace"], result["attribution"]

Run "python ml/pipeline.py" (from the repo root) or "python pipeline.py"
(from ml/) to execute the Persian Gulf demo scenario end-to-end and save the
combined result to ml/results/pipeline_demo_result.json.
"""

import base64
import io
import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image

# Make the stage packages importable no matter where this is run from.
ML_DIR = Path(__file__).resolve().parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from detection.model import load_model as load_detection_model, predict_oil_spill
from drift_trace.model import get_current_wind, trace_origin
from attribution.attribution import rank_vessels

# --- Demo scenario assets (shipped with the repo) ---------------------------

DEMO_CHECKPOINT = ML_DIR / "detection" / "checkpoints" / "sar_unet_best.pt"
DEMO_IMAGE = ML_DIR / "detection" / "data" / "test" / "sentinel" / "image" / "0.png"
DEMO_CURRENTS_FILE = ML_DIR / "drift_trace" / "demo_currents_persian_gulf.nc"
DEMO_AIS_DATA = ML_DIR / "attribution" / "data" / "synthetic_ais_persian_gulf.csv"
RESULTS_DIR = ML_DIR / "results"

# Persian Gulf demo scenario - the same point/time all three stages share.
DEMO_LON, DEMO_LAT = 51.5, 26.5
DEMO_DETECTION_TIME = datetime(2026, 8, 27, 12, 0, 0)

# Lazy, loaded-once detection model: importing this module stays cheap, and
# repeated pipeline calls reuse the weights instead of re-reading 124 MB.
_detection_model = None


def _get_detection_model(device=None):
    global _detection_model
    if _detection_model is None:
        _detection_model = load_detection_model(DEMO_CHECKPOINT, device)
    return _detection_model


def model_device(model):
    """Return the torch device a loaded model lives on."""
    return next(model.parameters()).device


def run_full_pipeline(image_path, detection_lon, detection_lat, detection_time,
                      ais_data_path, oil_type="GENERIC BUNKER C",
                      currents_file=DEMO_CURRENTS_FILE, device=None):
    """Run all three stages in sequence and return their combined result.

    Args:
        image_path: SAR image to segment (Stage 1 input).
        detection_lon, detection_lat: Where/when the spill was detected, in
            degrees. In production these come from the image's geospatial
            metadata; the demo supplies them manually.
        detection_time: datetime (or ISO string) of detection.
        ais_data_path: CSV of AIS vessel tracks (Stage 3 input).
        oil_type: OpenDrift oil type for the drift simulation.
        currents_file: netCDF current field for Stage 2. Defaults to the
            cached Copernicus Persian Gulf file shipped with the repo.
        device: torch device for Stage 1. Defaults to CUDA if available.

    Returns:
        dict with keys "detection", "drift_trace" and "attribution", each
        holding that stage's full result dict (detection includes the numpy
        oil mask under "mask").
    """
    if isinstance(detection_time, str):
        detection_time = datetime.fromisoformat(detection_time)

    # --- Stage 1: detect the spill in the SAR image -------------------------
    model = _get_detection_model(device)
    detection_result = predict_oil_spill(image_path, model, model_device(model))

    # --- Stage 2: trace the spill backward to its origin --------------------
    wind_u, wind_v = get_current_wind(detection_lat, detection_lon)
    drift_result = trace_origin(
        detection_lon, detection_lat, detection_time,
        oil_type=oil_type,
        currents_file=currents_file,
        wind_u=wind_u, wind_v=wind_v,
    )

    # --- Stage 3: rank vessels near the estimated origin --------------------
    # The window comes straight from Stage 2 - never recomputed here.
    attribution_result = rank_vessels(
        ais_df=ais_data_path,
        origin_lon=drift_result["estimated_origin_lon"],
        origin_lat=drift_result["estimated_origin_lat"],
        time_window_start=drift_result["origin_window_start"],
        time_window_end=drift_result["origin_window_end"],
    )

    return {
        "detection": detection_result,
        "drift_trace": drift_result,
        "attribution": attribution_result,
    }


# ---------------------------------------------------------------------------
# JSON serialization of the combined result
# ---------------------------------------------------------------------------


def _mask_to_png_base64(mask):
    """Encode a binary numpy mask as a base64 PNG string for JSON output."""
    image = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _json_safe(value):
    """Convert a stage result into JSON-serializable Python types."""
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, np.ndarray):
        if value.ndim == 2:  # the oil mask
            return {"mask_png_base64": _mask_to_png_base64(value),
                    "shape": list(value.shape)}
        return [_json_safe(v) for v in value.tolist()]
    if isinstance(value, (np.floating, np.integer)):
        return value.item()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


# ---------------------------------------------------------------------------
# Demo run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("OilTrace full pipeline - Persian Gulf demo scenario")
    print("=" * 72)
    print(f"SAR image     : {DEMO_IMAGE.name}")
    print(f"Detection     : {DEMO_LON} E, {DEMO_LAT} N at {DEMO_DETECTION_TIME}")
    print(f"AIS data      : {DEMO_AIS_DATA.name}")
    print()

    result = run_full_pipeline(
        image_path=DEMO_IMAGE,
        detection_lon=DEMO_LON, detection_lat=DEMO_LAT,
        detection_time=DEMO_DETECTION_TIME,
        ais_data_path=DEMO_AIS_DATA,
    )

    detection = result["detection"]
    drift = result["drift_trace"]
    suspects = result["attribution"]

    print("Stage 1 - detection")
    print(f"  oil pixel count : {detection['oil_pixel_count']}")
    print(f"  oil area        : {detection['oil_area_fraction']:.2%}")
    print()
    print("Stage 2 - drift trace (24 h backward, real wind + currents)")
    print(f"  estimated origin: {drift['estimated_origin_lon']:.4f} E, "
          f"{drift['estimated_origin_lat']:.4f} N")
    print(f"  origin time     : {drift['estimated_origin_time']}")
    print(f"  origin window   : {drift['origin_window_start']}  ->  "
          f"{drift['origin_window_end']}")
    print(f"  stranded early  : {drift['stranded_early']}")
    print()
    print(f"Stage 3 - attribution ({len(suspects)} candidate vessels ranked)")
    if suspects:
        header = (f"  {'#':>2}  {'MMSI':<10} {'vessel':<18} {'type':<10} "
                  f"{'score':>6} {'km':>7}")
        print(header)
        for s in suspects:
            print(f"  {s['rank']:>2}  {s['MMSI']:<10} {str(s['VesselName']):<18} "
                  f"{str(s['vessel_type']):<10} {s['combined_score']:6.3f} "
                  f"{s['closest_distance_km']:7.2f}")
    else:
        print("  no vessels were inside the search window")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RESULTS_DIR / "pipeline_demo_result.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(_json_safe(result), f, indent=2)
    print()
    print(f"Combined result saved to {output_path}")
