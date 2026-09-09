import httpx


WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"


async def get_environment(
    latitude: float,
    longitude: float
) -> dict:

    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "wind_speed_10m,"
            "wind_direction_10m,"
            "precipitation"
        ),
        "timezone": "auto"
    }

    marine_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "ocean_current_velocity,"
            "ocean_current_direction,"
            "sea_surface_temperature"
        ),
        "timezone": "auto",
        "cell_selection": "sea"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        weather_response = await client.get(
            WEATHER_URL,
            params=weather_params
        )

        marine_response = await client.get(
            MARINE_URL,
            params=marine_params
        )

    weather_response.raise_for_status()
    marine_response.raise_for_status()

    weather = weather_response.json()
    marine = marine_response.json()

    weather_current = weather.get("current", {})
    marine_current = marine.get("current", {})

    return {
        "latitude": latitude,
        "longitude": longitude,
        "weather": {
            "time": weather_current.get("time"),
            "temperature_2m_c": weather_current.get(
                "temperature_2m"
            ),
            "wind_speed_10m_kmh": weather_current.get(
                "wind_speed_10m"
            ),
            "wind_direction_10m_deg": weather_current.get(
                "wind_direction_10m"
            ),
            "precipitation_mm": weather_current.get(
                "precipitation"
            ),
        },
        "marine": {
            "time": marine_current.get("time"),
            "ocean_current_velocity_kmh": marine_current.get(
                "ocean_current_velocity"
            ),
            "ocean_current_direction_deg": marine_current.get(
                "ocean_current_direction"
            ),
            "sea_surface_temperature_c": marine_current.get(
                "sea_surface_temperature"
            ),
        },
    }