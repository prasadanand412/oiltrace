from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.simulation_engine import (
    SimulationGeoJSONResponse,
    SimulationRequest
)
from app.services.simulation_engine import simulate_spill


router = APIRouter(
    prefix="/simulate",
    tags=["Simulation"]
)


@router.post(
    "",
    response_model=SimulationGeoJSONResponse
)
async def simulate(
    payload: SimulationRequest,
    current_user=Depends(get_current_user)
):
    """
    Run the OilTrace baseline oil-spill simulation.

    Authentication is required.
    """

    return simulate_spill(payload)