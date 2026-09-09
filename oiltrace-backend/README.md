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
- `POST /sar/analyze` (authenticated multipart image upload)
- `POST /backtrack` (authenticated deterministic, environment-driven particle hindcast)
- `POST /attribution` (authenticated historical-AIS candidate ranking when a real AIS CSV is configured)

## Notes

The current simulation and prediction services are intentionally baseline implementations so the backend can be developed before the frontend and trained ML model are ready.

The `/predict` service is designed as the integration point for the future trained model.

## Investigation stages

`POST /backtrack` accepts an observed UTC time, unsigned decimal coordinates,
and explicit hemisphere directions (`N`/`S`, `E`/`W`). It converts them to
signed coordinates, obtains weather and marine conditions from the existing
environment service, and produces a GeoJSON trajectory and source-uncertainty
area. It is a deterministic physics-inspired baseline, not a trained model.

`POST /attribution` accepts Stage 2's signed source location, source time and
source-area GeoJSON. Set `OILTRACE_AIS_DATA_PATH` to a real historical AIS CSV
to enable the reusable `ml/attribution` scoring module. Without a configured
real feed it returns an explicit no-data result; it never creates fake live
vessels. Platform and natural-seep catalogues are intentionally reported as
unavailable until a verified source is configured.

## SAR Stage 1 detection

`POST /sar/analyze` accepts a PNG, JPEG, or TIFF image as the `image` multipart
field. It validates a maximum 10 MB, 256 x 256 Sentinel-1 SAR tile, then sends
the temporary file to the ML team's `predict_oil_spill` Stage 1 function. The
response contains the oil-pixel count, oil-area fraction, and a base64 PNG
segmentation mask. Temporary upload files are deleted after each request.

The trained weights are Git LFS content. Before running detection locally:

```bash
git lfs install
git lfs pull
```

For a non-default checkpoint location, set `OILTRACE_SAR_MODEL_PATH`. Docker
uses the repo-root build context so the `ml/detection` module and checkpoint are
available in the backend image.

The default JWT secret is for local development only. Set `OILTRACE_SECRET_KEY` before deployment.
