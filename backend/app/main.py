from fastapi import FastAPI

from app.core.config import settings
from app.db import models
from app.db.database import Base, engine
from app.routers import (
    auth,
    environment,
    prediction,
    simulate,
    simulation
)


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.app_name,
    description="Backend API for OilTrace oil spill simulation system",
    version=settings.app_version
)


app.include_router(auth.router)
app.include_router(simulation.router)
app.include_router(environment.router)
app.include_router(simulate.router)
app.include_router(prediction.router)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "message": "OilTrace Backend API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name
    }