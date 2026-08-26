from typing import Any

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Spill latitude"
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Spill longitude"
    )

    spill_volume_tons: float = Field(
        ...,
        gt=0,
        description="Estimated oil spill volume in tons"
    )

    wind_speed_kmh: float = Field(
        ...,
        ge=0,
        description="Wind speed in km/h"
    )

    current_speed_kmh: float = Field(
        ...,
        ge=0,
        description="Ocean current speed in km/h"
    )

    distance_to_coast_km: float = Field(
        ...,
        ge=0,
        description="Distance from spill location to coast in km"
    )


class PredictionResponse(BaseModel):
    model: str
    severity: str
    risk_score: float
    factors: dict[str, float]
    note: str
    geojson: dict[str, Any]