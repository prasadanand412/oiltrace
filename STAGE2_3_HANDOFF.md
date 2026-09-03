# SpillTrace / OilTrace — Full Project & Stage 2/3 Handoff

> Repo name: `oiltrace` (not "SpillTrace" — internal project codename only). Use this document to bring a new AI assistant (Genspark) fully up to speed on the project and to work through Stage 2 and Stage 3 in detail.

---

> **UPDATE — Sept 3, 2026: STAGES 2 AND 3 ARE COMPLETE, AND ALL THREE STAGES ARE WIRED END-TO-END.**
> The task breakdowns below are kept as the historical plan; the outcome, in brief:
>
> - All stage logic now lives in importable modules (not just notebooks):
>   `ml/detection/model.py` (UNet, `load_model()`, `predict_oil_spill()`),
>   `ml/drift_trace/model.py` (`trace_origin()`, `get_origin_estimate()`, `get_current_wind()`),
>   `ml/attribution/attribution.py` (`rank_vessels()` + synthetic AIS generation + scoring).
>   The notebooks next to them import from these modules — nothing is defined inline twice.
> - `ml/pipeline.py` orchestrates the full chain via `run_full_pipeline()`: detection →
>   real-wind backward drift trace (OpenWeatherMap wind + cached Copernicus currents) →
>   AIS vessel ranking, passing Stage 2's origin window straight into `rank_vessels()`.
>   Run it: `python ml/pipeline.py` → saves `ml/results/pipeline_demo_result.json`.
> - The Persian Gulf demo correctly ranks the synthetic scenario's planted culprit
>   (MT KAVERI) #1 of 14 candidates — see `ml/results/pipeline_demo_result.json`.
> - Real data wired for Stage 2: real wind via OpenWeatherMap (`OPENWEATHER_API_KEY` in
>   `.env`), real currents via `ml/drift_trace/demo_currents_persian_gulf.nc` (regenerable
>   via the notebook's Copernicus download cell). Fixed en route: the notebook had been
>   calling `get_current_wind(51.5, 26.5)` against a `(lat, lon)` signature — i.e. fetching
>   wind for the Balkans instead of the Persian Gulf; the call now uses the correct order,
>   so `ml/results/stage2_results.json` differs slightly from the original record.
> - Remaining open items: georeferencing of SAR imagery (Stage 1 gap, see CLAUDE.md),
>   `release_type` not yet affecting Stage 2 seeding, and validation against a real
>   historical spill case (Areen) — everything else in Sections 4 and 5 below is done.

---

## 1. Project Context

This is a Smart India Hackathon (SIH) 2026 project for a 5-person student team. The project pivoted from a self-defined idea ("OilTrace-AI" — an oil spill spread predictor) to the official NTRO problem statement **SIH26143** once it was released, since building toward an official PS is more valuable for actual SIH advancement.

### Official Problem Statement (SIH26143)
- **Title**: Leveraging satellite imagery to determine oil spills at sea along with AIS data correlations to identify the vessel responsible for the spill.
- **Organization**: National Technical Research Organisation (NTRO)
- **Category**: Software | **Theme**: Space Technology
- **Idea submission deadline**: 20 September 2026
- **Expected solution** (per NTRO): An automated detection and hindcasting ML pipeline that identifies oil slicks from satellite imagery, maps drift paths backward and forward, and ranks potential culprit vessels using AIS spatio-temporal correlation, presented via a visual interface.

### The Three-Stage Pipeline
1. **Stage 1 — Detection**: Deep learning segmentation model finds oil slicks in SAR satellite imagery.
2. **Stage 2 — Drift Trace**: Physics-based simulation traces the slick backward to estimate origin point/time, and forward to predict near-term future spread.
3. **Stage 3 — Vessel Attribution**: AIS (ship-tracking) data is filtered and scored to rank suspect vessels near the estimated origin.

### Team & Roles
| Role | Person | Focus |
|---|---|---|
| ML Model Architect | Prasad Anand | Stage 1 (detection) + Stage 2 (drift trace) — **this is me/you, the one doing Stage 2/3 manually now** |
| ML/Data Engineer | Nishad Fulzele | Stage 3 (AIS pipeline) + environmental data fetch for Stage 2 — **engagement has been inconsistent/minimal; do not block on him** |
| Backend Developer | Harsh Borse | FastAPI backend orchestrating all 3 stages |
| UI/UX & Frontend | Gaurav Patel | Map visualization: detection overlay, drift path, suspect ranking panel |
| Research/Validation/Docs | Areen Bagwan | Dataset sourcing, case-study validation, submission document/deck |

---

## 2. Stage 1 — COMPLETE (for reference/context)

- **Model**: U-Net semantic segmentation, PyTorch, single-channel grayscale input (256×256), binary sigmoid output (oil probability per pixel).
- **Dataset**: Kaggle "Deep-SAR SOS Oil Spill Segmentation Dataset" (Sentinel-1 subset) — chosen over the official, much larger Zenodo dataset (10-40GB) due to bandwidth/time constraints. Structure: `dataset/{train,test}/{palsar,sentinel}/{image,label}/`, numbered PNG files (e.g., `0.png`), matching filenames between image/label folders. Used the `sentinel` subfolder only (matches the actual satellite named in the official PS).
- **Training**: 100 epochs total — first 10 epochs on a local RTX 5060 laptop GPU, remaining 90 on a rented RTX 5090 (via Clore.ai, ~35 cents, ~8 min per 18 epochs at batch size 16-32). Used BCELoss, Adam optimizer (lr=1e-4), per-epoch checkpointing with best-validation-loss tracking (`sar_unet_best.pt` vs `sar_unet_checkpoint.pt`).
- **Result**: **Average IoU: 0.6630 on 839 test images** — a solid, reportable result for this task (published research on similar SAR datasets typically reports 0.6-0.85 IoU).
- **Known limitation**: Some false positives observed on "no-spill"/look-alike test cases (a documented, known-hard problem in SAR oil-spill detection research — algae blooms, low-wind zones, and biogenic films visually resemble oil in SAR imagery). This is worth stating honestly in documentation, not hidden.
- **Inference wrapper function** (`predict_oil_spill(image_path, model, device, threshold=0.5)`) was built — takes an image path, returns a binary mask + oil pixel count + area fraction. This is the function Harsh's backend will call.
- **Files produced** (now consolidated under `ml/`): `ml/detection/sar_detection_pipeline.ipynb` (clean pipeline: load model → evaluate → visualize → inference wrapper; imports from `ml/detection/model.py`), `ml/detection/sar_detection_model_training.ipynb` (full messy training history, kept for reference/reproducibility — NEVER re-run), `ml/detection/checkpoints/sar_unet_best.pt` (trained weights, ~118.5MB, tracked via Git LFS), `ml/results/training_results.json`, loss curve images. The inference wrapper (`predict_oil_spill`) and model loading (`load_model`) live in `ml/detection/model.py` — standalone check: `python ml/detection/model.py`.

---

## 3. Dev Environment Notes (carry these forward — do not repeat these mistakes)

- Laptop: RTX 5060 (Blackwell architecture), Ryzen 7, 16GB DDR5 RAM.
- **PyTorch stable (cu124 and earlier) does NOT support Blackwell GPUs** (sm_120 compatibility error) — required the **nightly build with CUDA 12.8**: `pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128`
- **Python 3.14 (default local install) is NOT supported by PyTorch** — had to register and use a separate Python 3.12 Jupyter kernel instead (`ipykernel install --user --name=py312-torch`).
- **NOAA NOMADS retired its OpenDAP data access format in Feb 2026** (Service Change Notice 25-81) — do NOT use old OpenDAP URLs for GFS wind data. Use OpenWeatherMap API instead (simpler, JSON-based, no format conversion needed), or NOMADS' Grib Filter + cfgrib if OpenWeatherMap proves insufficient later.
- **numpy version conflicts**: pin `numpy<2.5.0` for scipy/opendrift compatibility — a plain `pip install numpy` can grab too new a version and break imports.
- Kaggle free-tier GPU sessions are **unreliable for long unattended training** — got interrupted multiple times (accidental browser close, "Draft session starting" hangs). **Rented GPU servers (e.g., Clore.ai) were dramatically faster and more reliable** — an RTX 5090 rental did in ~8 minutes what Kaggle's T4 struggled to do in ~5 hours (including infrastructure issues). Recommendation: use a rented GPU server for any further heavy training in Stage 2/3 if needed, rather than fighting free-tier session limits again.
- **Git**: repo is named `oiltrace`. Model checkpoint files (`.pt`) exceed GitHub's 100MB limit — **Git LFS is configured** (`.gitattributes` tracks `*.pt`; a fresh clone needs `git lfs install && git lfs pull` or the checkpoint is a ~130-byte pointer). `.gitignore` excludes the dataset folder, `.env` (secrets), `__pycache__`/`.ipynb_checkpoints`, and large `.nc` downloads — except `ml/drift_trace/demo_currents_persian_gulf.nc`, which is committed (4.5MB, needed by the pipeline demo). The redundant `sar_unet_checkpoint.pt` (only the "latest," not "best," epoch) was deleted; only `ml/detection/checkpoints/sar_unet_best.pt` is kept.

---

## 4. STAGE 2 — Drift Trace — COMPLETE (detailed plan, kept as the historical record)

> Built as planned. Outcome: `ml/drift_trace/model.py` (`trace_origin()`, `get_origin_estimate()`,
> `get_current_wind()`), `ml/drift_trace/drift_trace_pipeline.ipynb` (imports from model.py),
> `ml/drift_trace/demo_currents_persian_gulf.nc` (cached Copernicus current field),
> `ml/results/stage2_results.json`. Task 7 (validation against a real historical spill
> case) remains open. Task list below is the original plan.

### Purpose
Given Stage 1's detected spill location/shape, estimate **where and when it originated** by tracing backward through real wind/current data. Also predict near-term future spread (forward trace) for response planning.

### Core Technical Approach
- **Engine**: OpenDrift (open-source Lagrangian particle-tracking oceanographic drift simulator; already installed and previously tested successfully in earlier prototype work — includes real coastline/landmask data, correctly handles particle "stranding" on land).
- **Physics**: Particles are seeded at the detection point, advected by current + wind vectors (wind drift ≈ 3% of wind speed, standard oceanographic convention), with added random-walk diffusion and mass decay (weathering) over time.
- **Backward tracing method**: Seed particles at the detected slick's location/time, then run the simulation with reversed wind/current vectors (or reversed time integration) to estimate where the oil most likely originated. The convergence area of the backward-traced particle cluster at the earliest simulated time gives the estimated origin point; the time elapsed gives the estimated origin time window.
- **Forward tracing**: Same engine, run normally (not reversed) from the current detection state, to predict where the spill will spread in the next several hours — useful for response planning, reuses the exact same setup as backward tracing minus the reversal.
- **Release type matters**: Instantaneous releases (e.g., tank rupture — a single point-release event at t=0) produce a compact, uniformly-aging patch. Continuous releases (e.g., an ongoing pipeline/drilling leak) produce a trailing, elongated plume, since each released increment starts aging from its own release moment, not from time zero. This should be a selectable parameter reflecting the suspected cause of the spill (aligns with any "cause of spill" metadata Stage 1/frontend might capture).

### Tasks (detailed)

1. **Set up a new clean notebook** (`drift_trace_pipeline.ipynb`) for this stage, separate from Stage 1's notebooks.

2. **Prototype backward-trace logic with dummy/fallback wind & current values** (not real data yet) — confirms the reversal logic produces a sensible backward spread before adding real-data complexity. Use OpenDrift's `set_config('environment:fallback:...')` pattern (already used successfully in earlier prototype testing).

3. **Extract and interpret backward-trace output**:
   - Use `o.result` (an xarray Dataset in this OpenDrift version — NOT the older `o.history` recarray API, which does not exist in this version) to get particle lon/lat positions at each timestep.
   - Compute the estimated origin point as the mean/centroid of particle positions at the final (earliest) backward timestep.
   - Compute the estimated origin time window as `detection_time - trace_duration`.

4. **Integrate real environmental data** (this is where Nishad's contribution would normally fit, but should not be blocked on him):
   - **Ocean currents**: Copernicus Marine Service (`copernicusmarine` Python package, free account required, use `.subset()` to download a bounded region/time-range rather than streaming per-request).
   - **Wind**: OpenWeatherMap API (simple JSON, free tier) — NOT NOAA NOMADS OpenDAP (retired). If more historical wind granularity is needed later, ERA5 reanalysis data via Copernicus Climate Data Store is the fallback, though it adds complexity (different API, `cdsapi` package).
   - Feed real data into OpenDrift via `opendrift.readers.reader_netCDF_CF_generic.Reader(...)` and `o.add_reader([...])`, replacing the fallback config values used in the prototype step.

5. **Handle stranding correctly**: If particles hit real coastline (OpenDrift's landmask) before reaching the desired trace duration, this is a valid, meaningful outcome (e.g., "the spill came from very near this specific coastal point") — not a bug. The data pipeline/logic should handle simulations that end early due to stranding gracefully (e.g., use last known position before stranding as the estimated origin, if stranding happens before the intended full backward-trace duration).

6. **Build a clean "trace_origin()" function** — the equivalent of Stage 1's `predict_oil_spill()` wrapper — that takes (detection location, detection time, oil type/properties, release type) as input and returns (estimated origin lon/lat, estimated origin time window, forward spread prediction) as output. This is what Harsh's backend will call.

7. **Validate against a real historical spill case** if one with known origin/vessel data can be found (Areen may have researched candidates) — feed in the real recorded wind/current conditions for that case and compare the backward-traced origin estimate to the actual known source location, as a credibility-building validation step for documentation.

8. **Document results**: similar to Stage 1's `training_results.json` — save a results summary noting the approach, data sources used, and any validation comparison performed.

### Known challenges to expect
- Real wind/current data availability and format handling (already hit several issues in Stage 1-adjacent OpenDrift work: NOMADS retirement, numpy/scipy version conflicts) — budget real debugging time.
- Backward-trace accuracy is fundamentally bounded by wind/current data quality/resolution, especially near coastlines — this should be stated as a limitation, not hidden.
- No dedicated ML model is trained for this stage — it's a live physics simulation call per request, not a "trained neural network" — this is a legitimate design choice (more scientifically defensible for an investigative tool than an approximated prediction), but should be described accurately in documentation as such, not conflated with "AI/ML" if it's really a physics simulation.

---

## 5. STAGE 3 — Vessel Attribution — COMPLETE (detailed plan, kept as the historical record)

> Built as planned (independently of Nishad, per the ownership note below). Outcome:
> `ml/attribution/attribution.py` (`rank_vessels()` entry point, plus `load_ais_data()`,
> `generate_synthetic_ais_data()` with a planted suspect, `filter_candidate_vessels()`,
> `score_vessels()`), `ml/attribution/attribution_pipeline.ipynb` (demo + validation:
> planted culprit ranks #1 across 25 randomized seeds, plus robustness checks against
> origin/time error and missing columns), `ml/attribution/data/synthetic_ais_persian_gulf.csv`
> (+ ground-truth JSON), `ml/attribution/README.md` (scoring methodology), results in
> `ml/results/attribution_results.json`. Task list below is the original plan.

### Purpose
Given Stage 2's estimated origin point and time window, identify and rank which vessels were most likely responsible for the spill, using historical AIS (Automatic Identification System) ship-tracking data.

### Data Source
- **marinecadastre.gov/accessais** — real historical US Coast Guard AIS data, standardized schema.
- **Standard AIS columns needed**: `MMSI` (unique vessel ID), `BaseDateTime` (timestamp), `LAT`, `LON`, `SOG` (speed over ground, knots), `COG` (course over ground, degrees), `Heading` (true heading, degrees), `VesselName`, `VesselType` (tanker/cargo/fishing/etc.), `Length`, `Draft`, `Status` (navigation status — underway, at anchor, moored, etc.).
- **Minimum viable subset** if starting simple: `MMSI, BaseDateTime, LAT, LON, SOG, COG` — enough for basic proximity + trajectory scoring; the rest can be added once core logic works.
- Real AIS data can be used where regional/temporal coverage is available; synthetic AIS data can be prepared for the demo region if real coverage is limited (this was explicitly suggested as acceptable in the official problem statement text itself).

### Tasks (detailed)

1. **Download/acquire a sample AIS dataset** covering a plausible demo region and time window (ideally matching whatever region/scenario is used for the Stage 1 + Stage 2 demo, for narrative consistency).

2. **Parse and clean the AIS data** into a usable DataFrame (pandas), confirming the actual column names/format match the schema above (may need minor renaming/type conversion — timestamps especially).

3. **Build geographic/temporal filtering**: given Stage 2's estimated origin point (lon/lat) and time window, filter the full AIS dataset down to only vessels that were within a plausible distance (e.g., some radius in km, tunable) of that point during that time window (with some buffer before/after to account for estimation uncertainty). This is a cheap filter to run before the more expensive scoring step.

4. **Build the scoring/ranking logic** — combine multiple factors into a single suspect score per candidate vessel:
   - **Proximity**: how close the vessel's position was to the estimated origin point during the window (closer = higher suspicion).
   - **Trajectory alignment**: does the vessel's course/heading (COG/Heading) suggest it was passing through or near the origin point, rather than moving away/unrelated.
   - **Behavioral anomalies**: unexplained course changes, sudden speed drops (SOG), or AIS signal gaps around the estimated spill time — these are often correlated with illicit discharge behavior and should be flagged as a meaningful positive signal, not just noise. An AIS gap (vessel stops broadcasting) near the estimated spill time/location is itself a suspicious signal worth surfacing, even though it also means less position data is available for that vessel.
   - **Vessel type**: tankers/cargo ships statistically more likely sources than smaller vessel types — minor weighting factor.
   - Combine into a weighted composite score (specific weights can start as reasonable defaults — e.g., 35% proximity, 30% trajectory, 25% anomaly, 10% vessel type — and be tuned/justified in documentation).

5. **Output format**: a ranked list of candidate vessels, each with: vessel name/ID, composite suspicion score, and a breakdown of which factors contributed (for transparency/explainability — important since this is inherently probabilistic, not a definitive accusation).

6. **Sanity-check the scoring logic** on a synthetic test scenario with a known "correct" answer planted (e.g., manually construct a small synthetic AIS dataset where one vessel's trajectory clearly passes through a known point/time, and confirm the scoring logic correctly ranks it highest) — this is a lightweight but meaningful validation step, doesn't require real ground-truth historical data.

7. **Build a clean "rank_vessels()" function** — takes (estimated origin lon/lat, estimated time window, AIS dataset/path) as input, returns the ranked suspect list as output. This is what Harsh's backend will call as the final stage in the pipeline.

### Known challenges to expect
- AIS coverage is incomplete — vessels can and do disable AIS to avoid tracking, which limits ground-truth certainty but is itself a meaningful anomaly signal (see above).
- Real AIS datasets can be large (many vessels, high-frequency position reports) — filtering early (geographic/temporal bounds) before scoring is important for performance.
- Vessel attribution is inherently probabilistic — output should always be framed as a ranked/scored suspect list with confidence levels, never a single definitive "this vessel did it" answer, both for scientific honesty and to avoid overclaiming in documentation/demo.

### Ownership note
This stage is nominally Nishad's responsibility, but given inconsistent engagement, it is being planned here for manual execution. If Nishad does produce work on this independently, the interface point (the `rank_vessels()` function signature: origin point + time window + AIS data in, ranked list out) should stay consistent so either version can be swapped in without breaking Harsh's backend integration.

---

## 6. Cross-Cutting Notes for Stage 2 & 3

- **Consistent function interfaces matter**: Stage 1 has `predict_oil_spill()` (in `ml/detection/model.py`), Stage 2 has `trace_origin()` (in `ml/drift_trace/model.py`), Stage 3 has `rank_vessels()` (in `ml/attribution/attribution.py`) — clean, single-purpose functions with clear input/output contracts. `ml/pipeline.py` (`run_full_pipeline()`) chains all three for the backend: image → `predict_oil_spill()` → `trace_origin()` → `rank_vessels()` → combined result dict (`detection` / `drift_trace` / `attribution` keys), demo output in `ml/results/pipeline_demo_result.json`.
- **Documentation discipline carried over from Stage 1**: for each stage, produce a results summary (JSON or similar) capturing key metrics/parameters used, and be explicit and honest about limitations rather than glossing over them — this consistently strengthened Stage 1's credibility and should continue. All stage results are consolidated in `ml/results/`.
- **Git workflow**: the move from notebook form into clean, backend-importable `.py` files described here is DONE (see the status update at the top of this document).
- **Timeline**: Idea submission deadline is **20 September 2026**. Given Stage 1 is complete and Stages 2/3 remain, prioritize getting at least simplified, working versions of both stages functional over polishing any single piece extensively — a credible end-to-end pipeline (even with simplified Stage 3 scoring, for instance) is a stronger submission than one perfect stage and two missing ones.
