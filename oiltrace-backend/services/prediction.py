import math

from schemas import PredictionRequest


def _severity(score: float):
    if score < 30:
        return "LOW"
    if score < 60:
        return "MEDIUM"
    if score < 80:
        return "HIGH"
    return "CRITICAL"


def _risk_polygon(lat: float, lon: float, radius_km: float):
    lat_delta = radius_km / 111.32
    lon_delta = radius_km / (111.32 * max(math.cos(math.radians(lat)), 0.1))

    coordinates = [[
        [lon - lon_delta, lat - lat_delta],
        [lon + lon_delta, lat - lat_delta],
        [lon + lon_delta, lat + lat_delta],
        [lon - lon_delta, lat + lat_delta],
        [lon - lon_delta, lat - lat_delta],
    ]]

    return {
        "type": "Feature",
        "properties": {"radius_km": round(radius_km, 2)},
        "geometry": {"type": "Polygon", "coordinates": coordinates},
    }


def predict_risk(payload: PredictionRequest):
    volume_factor = min(payload.spill_volume_tons / 1000 * 35, 35)
    wind_factor = min(payload.wind_speed_kmh / 80 * 20, 20)
    current_factor = min(payload.current_speed_kmh / 10 * 15, 15)

    # Close proximity to the coast increases environmental impact.
    coast_factor = max(0, 30 - payload.distance_to_coast_km * 1.5)

    score = round(
        min(100, volume_factor + wind_factor + current_factor + coast_factor),
        2,
    )

    severity = _severity(score)

    radius = max(
        1.0,
        payload.spill_volume_tons ** 0.5
        + payload.current_speed_kmh * 0.5
        + payload.wind_speed_kmh * 0.03,
    )

    return {
        "model": "OilTrace-Baseline-Risk-v1",
        "severity": severity,
        "risk_score": score,
        "factors": {
            "spill_volume_factor": round(volume_factor, 2),
            "wind_factor": round(wind_factor, 2),
            "current_factor": round(current_factor, 2),
            "coast_proximity_factor": round(coast_factor, 2),
            "note": "Baseline heuristic; replace with trained ML model when available.",
        },
        "geojson": {
            "type": "FeatureCollection",
            "features": [_risk_polygon(payload.latitude, payload.longitude, radius)],
        },
    }
