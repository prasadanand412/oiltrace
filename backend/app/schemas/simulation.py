from datetime import datetime

from pydantic import BaseModel, Field


class SimulationCreate(BaseModel):
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Spill location latitude"
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Spill location longitude"
    )

    volume: float = Field(
        ...,
        gt=0,
        description="Oil spill volume"
    )

    oil_type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Type of oil"
    )

    duration_hours: float = Field(
        ...,
        gt=0,
        le=720,
        description="Simulation duration in hours"
    )


class SimulationResponse(BaseModel):
    id: int
    user_id: int
    latitude: float
    longitude: float
    volume: float
    oil_type: str
    duration_hours: float
    status: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }