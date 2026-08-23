# OilTrace Backend

Standalone FastAPI backend MVP for the OilTrace project.

## Features

- JWT authentication
- User registration and login
- Protected backend endpoints
- Live weather data through Open-Meteo
- Live ocean-current data through Open-Meteo Marine API
- Baseline Lagrangian-style oil-spill particle simulation
- Baseline risk prediction endpoint
- Map-ready GeoJSON responses
- Swagger/OpenAPI documentation

## Run locally

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Windows Git Bash:

```bash
source .venv/Scripts/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn main:app --reload
```

Open:

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs

## Main endpoints

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /me`
- `GET /environment?latitude=...&longitude=...`
- `POST /simulate`
- `POST /predict`

## Notes

The current simulation and prediction services are intentionally baseline implementations so the backend can be developed before the frontend and trained ML model are ready.

The `/predict` service is designed as the integration point for the future trained model.

The default JWT secret is for local development only. Set `OILTRACE_SECRET_KEY` before deployment.
