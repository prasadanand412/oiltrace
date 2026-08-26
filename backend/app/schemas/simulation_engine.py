from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Starting latitude"
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Starting longitude"
    )

    wind_speed_kmh: float = Field(
        ...,
        ge=0,
        description="Wind speed in km/h"
    )

    wind_direction_deg: float = Field(
        ...,
        ge=0,
        le=360,
        description="Wind direction in degrees"
    )

    current_speed_kmh: float = Field(
        ...,
        ge=0,
        description="Ocean current speed in km/h"
    )

    current_direction_deg: float = Field(
        ...,
        ge=0,
        le=360,
        description="Ocean current direction in degrees"
    )

    hours: float = Field(
        ...,
        gt=0,
        le=720,
        description="Simulation duration in hours"
    )

    particles: int = Field(
        100,
        ge=1,
        le=5000,
        description="Number of oil particles"
    )

    spread_km: float = Field(
        1.0,
        ge=0,
        description="Initial spill spread in kilometres"
    )


class SimulationGeoJSONResponse(BaseModel):
    model: str
    hours: float
    particles: int
    geojson: dict