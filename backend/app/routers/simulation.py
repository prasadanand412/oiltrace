from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import Simulation, User
from app.schemas.simulation import (
    SimulationCreate,
    SimulationResponse,
)


router = APIRouter(
    prefix="/simulation",
    tags=["Simulation"]
)


@router.post(
    "",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED
)
def create_simulation(
    simulation_data: SimulationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    simulation = Simulation(
        user_id=current_user.id,
        latitude=simulation_data.latitude,
        longitude=simulation_data.longitude,
        volume=simulation_data.volume,
        oil_type=simulation_data.oil_type,
        duration_hours=simulation_data.duration_hours,
        status="pending"
    )

    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return simulation


@router.get(
    "",
    response_model=list[SimulationResponse]
)
def get_my_simulations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    simulations = (
        db.query(Simulation)
        .filter(Simulation.user_id == current_user.id)
        .order_by(Simulation.created_at.desc())
        .all()
    )

    return simulations