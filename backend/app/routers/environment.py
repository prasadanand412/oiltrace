from fastapi import APIRouter, HTTPException, Query

from app.schemas.environment import EnvironmentResponse
from app.services.environment import get_environment


router = APIRouter(
    prefix="/environment",
    tags=["Environment"]
)


@router.get(
    "",
    response_model=EnvironmentResponse
)
async def environment(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
        description="Location latitude"
    ),
    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
        description="Location longitude"
    )
):
    try:
        return await get_environment(
            latitude=latitude,
            longitude=longitude
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch environmental data: {exc}"
        )