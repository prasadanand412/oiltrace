"""Explainable Stage 2 particle-backtracking baseline.

This service deliberately uses a deterministic, physics-inspired transport
calculation rather than presenting the result as a trained ML model.  It uses
the active weather/marine service once per run, applies a conventional 3% wind
leeway, reverses the combined transport vector, and returns GeoJSON for the UI.
The richer OpenDrift implementation from ``ml/drift_trace/model.py`` remains
available for deployments that provide its Copernicus current field and runtime.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone


EARTH_KM_PER_DEGREE = 111.32
WIND_LEEWAY = 0.03


def signed_coordinate(value: float, direction: str, positive: str) -> float:
    """Convert an unsigned coordinate plus hemisphere into signed decimal degrees."""
    return float(value) if direction.upper() == positive else -float(value)


def _vector(speed_kmh: float, direction_deg: float) -> tuple[float, float]:
    """Return east/north velocity from a compass bearing pointing *towards*."""
    radians = math.radians(direction_deg)
    return speed_kmh * math.sin(radians), speed_kmh * math.cos(radians)


def _move(latitude: float, longitude: float, east_km: float, north_km: float) -> tuple[float, float]:
    latitude = max(-90.0, min(90.0, latitude + north_km / EARTH_KM_PER_DEGREE))
    longitude_scale = max(0.01, EARTH_KM_PER_DEGREE * math.cos(math.radians(latitude)))
    longitude = longitude + east_km / longitude_scale
    longitude = ((longitude + 180.0) % 360.0) - 180.0
    return latitude, longitude


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def run_backtracking(
    *,
    observed_latitude: float,
    observed_longitude: float,
    observation_time: datetime,
    environment: dict,
    duration_hours: int,
    steps: int,
) -> dict:
    """Backtrack a compact particle cluster and create a source-area GeoJSON."""
    if observation_time.tzinfo is None:
        observation_time = observation_time.replace(tzinfo=timezone.utc)

    weather = environment["weather"]
    marine = environment["marine"]
    wind_speed = float(weather.get("wind_speed_10m_kmh") or 0.0)
    wind_from = float(weather.get("wind_direction_10m_deg") or 0.0)
    current_speed = float(marine.get("ocean_current_velocity_kmh") or 0.0)
    current_to = float(marine.get("ocean_current_direction_deg") or 0.0)

    # Meteorological wind direction is where it comes FROM; leeway is therefore
    # transported 180 degrees opposite it. Marine current direction is treated
    # as direction of flow, matching Open-Meteo's current direction convention.
    wind_east, wind_north = _vector(wind_speed * WIND_LEEWAY, (wind_from + 180.0) % 360.0)
    current_east, current_north = _vector(current_speed, current_to)
    forward_east, forward_north = wind_east + current_east, wind_north + current_north
    step_hours = duration_hours / steps

    trajectory = []
    latitude, longitude = observed_latitude, observed_longitude
    for index in range(steps + 1):
        timestamp = observation_time - timedelta(hours=index * step_hours)
        trajectory.append(
            {
                "step": index,
                "time": _iso(timestamp),
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
            }
        )
        if index < steps:
            latitude, longitude = _move(
                latitude,
                longitude,
                -forward_east * step_hours,
                -forward_north * step_hours,
            )

    source = trajectory[-1]
    # A transparent uncertainty radius that grows with elapsed time and motion.
    source_radius_km = round(max(1.0, 0.35 * duration_hours + 0.15 * math.hypot(forward_east, forward_north) * duration_hours), 2)
    ring = []
    for bearing in range(0, 361, 30):
        east, north = _vector(source_radius_km, bearing)
        ring.append(list(reversed(_move(source["latitude"], source["longitude"], east, north))))

    line_coordinates = [[point["longitude"], point["latitude"]] for point in trajectory]
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {"kind": "backtracking_trajectory"}, "geometry": {"type": "LineString", "coordinates": line_coordinates}},
            {"type": "Feature", "properties": {"kind": "observed_slick", "time": trajectory[0]["time"]}, "geometry": {"type": "Point", "coordinates": line_coordinates[0]}},
            {"type": "Feature", "properties": {"kind": "estimated_source", "time": source["time"], "radius_km": source_radius_km}, "geometry": {"type": "Point", "coordinates": line_coordinates[-1]}},
            {"type": "Feature", "properties": {"kind": "source_uncertainty_area", "radius_km": source_radius_km}, "geometry": {"type": "Polygon", "coordinates": [ring]}},
        ],
    }
    return {
        "method": "Deterministic physics-inspired particle backtracking (not a trained ML model)",
        "observed_location": {"latitude": observed_latitude, "longitude": observed_longitude},
        "observation_time": _iso(observation_time),
        "trajectory": trajectory,
        "estimated_source": {"latitude": source["latitude"], "longitude": source["longitude"], "time": source["time"], "uncertainty_radius_km": source_radius_km},
        "duration_hours": duration_hours,
        "steps": steps,
        "environment_used": {
            "wind_speed_10m_kmh": wind_speed,
            "wind_direction_from_deg": wind_from,
            "ocean_current_velocity_kmh": current_speed,
            "ocean_current_direction_to_deg": current_to,
            "wind_leeway_fraction": WIND_LEEWAY,
            "source": "Open-Meteo current weather and marine conditions",
        },
        "geojson": geojson,
        "limitations": "This MVP uses current environmental conditions as a constant vector across the trace. Historical, spatially varying wind/current fields improve hindcast accuracy.",
    }
