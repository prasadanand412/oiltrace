import math
import random

from app.schemas.simulation_engine import SimulationRequest


def destination(
    lat: float,
    lon: float,
    speed_kmh: float,
    direction_deg: float,
    hours: float
):
    """
    Calculate the approximate destination point
    after moving at a given speed and direction.
    """

    distance_km = speed_kmh * hours
    angle = math.radians(direction_deg)

    north_km = distance_km * math.cos(angle)
    east_km = distance_km * math.sin(angle)

    new_lat = lat + (north_km / 111.32)

    lat_factor = max(
        math.cos(math.radians(lat)),
        0.1
    )

    new_lon = lon + (
        east_km / (111.32 * lat_factor)
    )

    return new_lat, new_lon


def simulate_spill(payload: SimulationRequest) -> dict:
    """
    Run the OilTrace baseline Lagrangian
    oil-spill particle simulation.
    """

    random.seed(42)

    total_speed = (
        payload.wind_speed_kmh * 0.03
        + payload.current_speed_kmh
    )

    direction_deg = (
        payload.wind_direction_deg * 0.3
        + payload.current_direction_deg * 0.7
    ) % 360

    features = []

    for particle_id in range(payload.particles):

        jitter_km = random.gauss(
            0,
            payload.spread_km
        )

        jitter_direction = random.uniform(
            0,
            360
        )

        jitter_lat, jitter_lon = destination(
            payload.latitude,
            payload.longitude,
            abs(jitter_km),
            jitter_direction,
            1
        )

        final_lat, final_lon = destination(
            jitter_lat,
            jitter_lon,
            total_speed,
            direction_deg,
            payload.hours
        )

        features.append(
            {
                "type": "Feature",
                "properties": {
                    "particle_id": particle_id,
                    "hours": payload.hours,
                    "estimated_speed_kmh": round(
                        total_speed,
                        3
                    )
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        round(final_lon, 6),
                        round(final_lat, 6)
                    ]
                }
            }
        )

    return {
        "model": "OilTrace-Lagrangian-Baseline-v1",
        "hours": payload.hours,
        "particles": payload.particles,
        "geojson": {
            "type": "FeatureCollection",
            "features": features
        }
    }