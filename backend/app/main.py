from fastapi import FastAPI

app = FastAPI(
    title="OilTrace Backend",
    description="Backend API for OilTrace oil spill simulation system",
    version="1.0.0"
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "OilTrace Backend"
    }