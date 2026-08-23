from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class EnvironmentResponse(BaseModel):
    latitude: float
    longitude: float
    weather: dict
    marine: dict


class SimulationRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    hours: int = Field(default=12, ge=1, le=72)
    particles: int = Field(default=250, ge=10, le=2000)
    wind_speed_kmh: float = Field(default=15, ge=0, le=150)
    wind_direction_deg: float = Field(default=90, ge=0, le=360)
    current_speed_kmh: float = Field(default=1, ge=0, le=20)
    current_direction_deg: float = Field(default=90, ge=0, le=360)
    spread_km: float = Field(default=1.0, gt=0, le=20)


class SimulationResponse(BaseModel):
    model: str
    hours: int
    particles: int
    geojson: dict


class PredictionRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    spill_volume_tons: float = Field(gt=0, le=100000)
    wind_speed_kmh: float = Field(ge=0, le=150)
    current_speed_kmh: float = Field(ge=0, le=20)
    distance_to_coast_km: float = Field(ge=0, le=1000)


class PredictionResponse(BaseModel):
    model: str
    severity: str
    risk_score: float
    factors: dict
    geojson: dict
