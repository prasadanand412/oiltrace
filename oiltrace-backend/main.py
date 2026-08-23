from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    register_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from schemas import (
    RegisterRequest,
    TokenResponse,
    EnvironmentResponse,
    SimulationRequest,
    SimulationResponse,
    PredictionRequest,
    PredictionResponse,
)
from services.environment import get_environment
from services.simulation import simulate_spill
from services.prediction import predict_risk

app = FastAPI(
    title="OilTrace Backend API",
    version="0.1.0",
    description="Standalone backend MVP for oil-spill tracking and risk estimation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this when the frontend domain is known.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["System"])
def root():
    return {
        "project": "OilTrace",
        "service": "backend",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["System"])
def health():
    return {"status": "healthy"}


@app.post("/auth/register", tags=["Authentication"])
def register(payload: RegisterRequest):
    try:
        user = register_user(payload.username, payload.password)
        return {"message": "User registered", "username": user["username"]}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/auth/login", response_model=TokenResponse, tags=["Authentication"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        {"sub": user["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer"}


@app.get("/me", tags=["Authentication"])
def me(current_user=Depends(get_current_user)):
    return {"username": current_user["username"]}


@app.get("/environment", response_model=EnvironmentResponse, tags=["Environment"])
async def environment(
    latitude: float,
    longitude: float,
    current_user=Depends(get_current_user),
):
    return await get_environment(latitude, longitude)


@app.post("/simulate", response_model=SimulationResponse, tags=["Simulation"])
def simulate(
    payload: SimulationRequest,
    current_user=Depends(get_current_user),
):
    return simulate_spill(payload)


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(
    payload: PredictionRequest,
    current_user=Depends(get_current_user),
):
    return predict_risk(payload)
