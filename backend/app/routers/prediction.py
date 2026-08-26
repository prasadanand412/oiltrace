from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse
)
from app.services.prediction import predict_risk


router = APIRouter(
    prefix="/predict",
    tags=["Prediction"]
)


@router.post(
    "",
    response_model=PredictionResponse
)
async def predict(
    payload: PredictionRequest,
    current_user=Depends(get_current_user)
):
    """
    Calculate oil-spill risk and return
    map-ready GeoJSON.
    """

    return predict_risk(payload)