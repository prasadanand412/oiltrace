from typing import Optional

from pydantic import BaseModel, Field


class WeatherData(BaseModel):
    time: Optional[str] = None
    temperature_2m_c: Optional[float] = None
    wind_speed_10m_kmh: Optional[float] = None
    wind_direction_10m_deg: Optional[float] = None
    precipitation_mm: Optional[float] = None


class MarineData(BaseModel):
    time: Optional[str] = None
    ocean_current_velocity_kmh: Optional[float] = None
    ocean_current_direction_deg: Optional[float] = None
    sea_surface_temperature_c: Optional[float] = None


class EnvironmentResponse(BaseModel):
    latitude: float
    longitude: float
    weather: WeatherData
    marine: MarineData