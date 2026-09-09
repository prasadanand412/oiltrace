import io
import tempfile
from pathlib import Path

from fastapi import FastAPI, Depends, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
import httpx
from PIL import Image, UnidentifiedImageError

from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_current_admin,
    register_user,
    get_all_users,
    logout_user,
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
from services.sar_detection import PipelineUnavailableError, analyze_image


app = FastAPI(
    title="OilTrace Backend API",
    version="0.1.0",
    description="Standalone backend MVP for oil-spill tracking and risk estimation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
    return {
        "status": "healthy"
    }


@app.post("/auth/register", tags=["Authentication"])
def register(payload: RegisterRequest):
    try:
        user = register_user(
            payload.username,
            payload.password,
        )

        return {
            "message": "User registered",
            "username": user["username"],
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


@app.post(
    "/auth/login",
    response_model=TokenResponse,
    tags=["Authentication"],
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = authenticate_user(
        form_data.username,
        form_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    token = create_access_token(
        {"sub": user["username"]},
        expires_delta=timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@app.post(
    "/auth/logout",
    tags=["Authentication"],
)
def logout(
    current_user=Depends(get_current_user),
):
    success = logout_user(
        current_user["username"]
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return {
        "message": "User logged out successfully",
        "username": current_user["username"],
    }


@app.get(
    "/me",
    tags=["Authentication"],
)
def me(
    current_user=Depends(get_current_user),
):
    return {
        "username": current_user["username"],
        "is_admin": current_user["is_admin"],
    }


@app.get(
    "/admin/users",
    tags=["Admin"],
)
def admin_users(
    current_admin=Depends(get_current_admin),
):
    return get_all_users()


@app.get(
    "/environment",
    response_model=EnvironmentResponse,
    tags=["Environment"],
)
async def environment(
    latitude: float,
    longitude: float,
    current_user=Depends(get_current_user),
):
    try:
        return await get_environment(latitude, longitude)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather and marine data are temporarily unavailable.",
        ) from exc


@app.post(
    "/simulate",
    response_model=SimulationResponse,
    tags=["Simulation"],
)
def simulate(
    payload: SimulationRequest,
    current_user=Depends(get_current_user),
):
    return simulate_spill(payload)


@app.post(
    "/predict",
    response_model=PredictionResponse,
    tags=["Prediction"],
)
def predict(
    payload: PredictionRequest,
    current_user=Depends(get_current_user),
):
    return predict_risk(payload)


@app.post("/sar/analyze", tags=["SAR Detection"])
async def analyze_sar_image(
    image: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Process one 256x256 SAR image through the ML pipeline's Stage 1."""
    allowed_types = {"image/png", "image/jpeg", "image/tiff"}
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a PNG, JPEG, or TIFF SAR image.",
        )

    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Select an image to analyze.")
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="The image must be 10 MB or smaller.")

    try:
        with Image.open(io.BytesIO(contents)) as source_image:
            source_image.verify()
        with Image.open(io.BytesIO(contents)) as source_image:
            dimensions = source_image.size
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.")

    if dimensions != (256, 256):
        raise HTTPException(
            status_code=422,
            detail="Stage 1 requires a 256 × 256 Sentinel-1 SAR tile.",
        )

    suffix = Path(image.filename or "scene.png").suffix.lower() or ".png"
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary_file:
            temporary_file.write(contents)
            temporary_path = Path(temporary_file.name)

        result = analyze_image(temporary_path)
        return {"status": "completed", "filename": image.filename, "result": result}
    except PipelineUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The SAR detection model is unavailable. Confirm the model checkpoint and ML dependencies are installed.",
        ) from exc
    finally:
        if temporary_path:
            temporary_path.unlink(missing_ok=True)
