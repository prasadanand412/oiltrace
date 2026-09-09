import math
from app.schemas.prediction import PredictionRequest


def calculate_severity(score: float) -> str:
    """
    Convert a numerical risk score into a severity level.
    """

    if score < 30:
        return "LOW"

    if score < 60:
        return "MEDIUM"

    if score < 80:
        return "HIGH"

    return "CRITICAL"


def create_risk_polygon(
    latitude: float,
    longitude: float,
    radius_km: float
) -> dict:
    """
    Create an approximate circular risk area
    represented as a GeoJSON Polygon.
    """

    lat_delta = radius_km / 111.32

    lon_delta = radius_km / (
        111.32
        * max(
            math.cos(math.radians(latitude)),
            0.1
        )
    )

    coordinates = [
        [
            longitude - lon_delta,
            latitude - lat_delta
        ],
        [
            longitude + lon_delta,
            latitude - lat_delta
        ],
        [
            longitude + lon_delta,
            latitude + lat_delta
        ],
        [
            longitude - lon_delta,
            latitude + lat_delta
        ],
        [
            longitude - lon_delta,
            latitude - lat_delta
        ]
    ]

    return {
        "type": "Feature",
        "properties": {
            "radius_km": round(radius_km, 2)
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [coordinates]
        }
    }


def predict_risk(
    payload: PredictionRequest
) -> dict:
    """
    Calculate baseline oil-spill risk.

    This is a heuristic baseline and will later
    be replaced by the trained ML model.
    """

    volume_factor = min(
        payload.spill_volume_tons / 1000 * 35,
        35
    )

    wind_factor = min(
        payload.wind_speed_kmh / 80 * 20,
        20
    )

    current_factor = min(
        payload.current_speed_kmh / 10 * 15,
        15
    )

    coast_factor = max(
        30 - payload.distance_to_coast_km * 1.5,
        0
    )

    score = round(
        min(
            100,
            volume_factor
            + wind_factor
            + current_factor
            + coast_factor
        ),
        2
    )

    severity = calculate_severity(score)

    radius = max(
        1.0,
        payload.spill_volume_tons ** 0.5
        + payload.current_speed_kmh * 0.5
        + payload.wind_speed_kmh * 0.3
    )

    risk_feature = create_risk_polygon(
        payload.latitude,
        payload.longitude,
        radius
    )

    return {
        "model": "OilTrace-Baseline-Risk-v1",
        "severity": severity,
        "risk_score": score,
        "factors": {
            "spill_volume_factor": round(
                volume_factor,
                2
            ),
            "wind_factor": round(
                wind_factor,
                2
            ),
            "current_factor": round(
                current_factor,
                2
            ),
            "coast_proximity_factor": round(
                coast_factor,
                2
            ),
        },
        "note": (
            "Baseline heuristic risk calculation. "
            "Replace with trained ML model when available."
        ),
        "geojson": {
            "type": "FeatureCollection",
            "features": [
                risk_feature
            ]
        }
    }