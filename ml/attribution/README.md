# Stage 3 — Vessel Attribution (AIS correlation)

Part of **oiltrace / SpillTrace**, built for Smart India Hackathon 2026,
problem statement **SIH26143** (NTRO): *"Leveraging satellite imagery to determine
oil spills at sea along with AIS data correlations to identify the vessel
responsible for the spill."*

## Where this sits in the pipeline

| Stage | What it does | Entry point |
|---|---|---|
| 1 — Detection | Finds oil slicks in SAR satellite imagery (U-Net, PyTorch) | `predict_oil_spill()` |
| 2 — Drift trace | Traces the slick backward through wind and current data to estimate where and when the oil was released (OpenDrift) | `trace_origin()` |
| **3 — Attribution** | **Ranks vessels that were near that origin at that time, using AIS ship-tracking data** | **`rank_vessels()`** |

Stage 3 answers one question: **given an estimated release point and time window,
which ships were there, and which of them behaved like the culprit?**

The output is a **ranked list of suspects with a score breakdown** — deliberately
not a single accusation. AIS correlation produces circumstantial evidence: it says
a vessel's track is *consistent with* the spill, which is grounds to investigate,
not proof.

## Files

```
ml/attribution/
├── attribution.py                          # all logic; import this from the backend
├── attribution_pipeline.ipynb              # end-to-end demo, plots, validation
├── attribution_results.json                # results summary written by the notebook
├── README.md                               # this file
└── data/
    ├── synthetic_ais_persian_gulf.csv      # demo AIS feed (2,787 reports, 20 vessels)
    └── synthetic_ais_persian_gulf_ground_truth.json  # the vessel planted as the culprit
```

## Quick start

```bash
# 1. Run the built-in sanity check (builds a scenario, asserts the culprit ranks #1)
#    Python 3.12 - on Windows with several versions installed: py -3.12 attribution.py
python attribution.py

# 2. Or work through the full demo with plots and validation
jupyter notebook attribution_pipeline.ipynb
```

```python
# 3. Or call it directly
import attribution

suspects = attribution.rank_vessels(
    ais_df="data/synthetic_ais_persian_gulf.csv",   # DataFrame or CSV path
    origin_lon=51.50,                               # from Stage 2
    origin_lat=26.50,
    time_window_start="2026-08-26 09:00",
    time_window_end="2026-08-26 15:00",
    radius_km=50,
)

for s in suspects[:3]:
    print(s["rank"], s["VesselName"], s["combined_score"], s["closest_distance_km"])
```

Requires `numpy` and `pandas` only (plus `matplotlib` for the notebook). No GPU,
no model weights, nothing to download — the scoring is arithmetic on a DataFrame,
so a request completes in well under a second on a few thousand AIS reports.

## Public API

Every function below has a full docstring in `attribution.py`; this is the map.

### `rank_vessels(...)` — the entry point the backend calls

```python
rank_vessels(ais_df, origin_lon, origin_lat, time_window_start, time_window_end,
             radius_km=50.0, time_buffer_hours=6.0, weights=None, max_results=None)
```

| Argument | Meaning |
|---|---|
| `ais_df` | AIS reports: a `DataFrame`, or a path to a CSV (loaded for you) |
| `origin_lon`, `origin_lat` | Estimated release point from Stage 2, decimal degrees |
| `time_window_start`, `time_window_end` | Estimated release window; `datetime`, string, or anything `pd.to_datetime` accepts |
| `radius_km` | Candidate search radius around the origin |
| `time_buffer_hours` | Slack added either side of the window, to absorb Stage 2's timing uncertainty |
| `weights` | Optional `{"proximity": …, "trajectory": …, "anomaly": …, "vessel_type": …}` override; renormalised to sum to 1 |
| `max_results` | Truncate to the top *N* suspects |

Returns a **list of dicts, highest score first** (empty list if no vessel was in
range — a legitimate answer, not an error). A closer approach breaks ties. Each dict:

```python
{
  "rank": 1,
  "MMSI": "251765553",              # string: an identifier, not a quantity
  "VesselName": "MT KAVERI",
  "combined_score": 0.9406,         # 0-1, the ranking key
  "proximity_score": 0.9543,        # the four factors, each 0-1
  "trajectory_score": 0.9986,
  "anomaly_score": 0.8281,
  "vessel_type_score": 1.0,
  "vessel_type": "tanker",          # normalised class
  "vessel_type_raw": "tanker",      # exactly what the feed said (80 on a numeric feed)
  "closest_distance_km": 3.241,     # the evidence behind proximity
  "closest_approach_time": "2026-08-26T11:30:00",   # ISO 8601 strings throughout
  "n_positions": 41,
  "first_report_time": "2026-08-26T08:00:00",
  "last_report_time":  "2026-08-26T16:00:00",
  "course_source": "COG",           # "COG" / "Heading" / "derived from track" / "unavailable"
  "trajectory_detail": {            # raw magnitudes behind each sub-score
      "best_alignment_deg": 0.12, "alignment_distance_km": 4.322,
      "alignment_time": "2026-08-26T11:20:00", "approach_reports_considered": 19},
  "anomaly_detail": {
      "speed_drop_knots": 7.5,  "speed_drop_score": 0.9375,
      "course_change_deg": 56.0, "course_change_score": 0.9333,
      "max_ais_gap_minutes": 90.0, "ais_gap_score": 0.6667,
      "reports_in_scan_window": 41},
  "weights_used": {"proximity": 0.35, "trajectory": 0.30,
                   "anomaly": 0.25, "vessel_type": 0.10},
}
```

Every value is a plain JSON-serialisable Python type — no numpy scalars, no
`Timestamp` objects, MMSI as a string so it cannot pick up float formatting on the
way to the frontend. `json.dumps()` on a result works as-is, so FastAPI can return
the list directly.

### Supporting functions

| Function | Use |
|---|---|
| `load_ais_data(filepath)` | Read an AIS CSV, normalise column names, parse timestamps, strip AIS "not available" sentinels. Raises if `MMSI`, `BaseDateTime`, `LAT` or `LON` are missing; warns about missing optional columns and carries on. |
| `prepare_ais_dataframe(df)` | Same normalisation for a DataFrame you already have. `rank_vessels` calls it for you. |
| `generate_synthetic_ais_data(...)` | Build a test feed: mostly unrelated traffic plus exactly one planted culprit. Returns `(DataFrame, ground_truth_dict)`. |
| `filter_candidate_vessels(...)` | Cheap prefilter — returns the full in-window track of every vessel that came within `radius_km`. |
| `score_vessel(...)` | Score one vessel's track. Same dict as above, minus `rank`. |
| `normalize_vessel_type(x)` | Numeric AIS type code or free text → `"tanker"`, `"cargo"`, `"fishing"`, … |
| `haversine_km`, `bearing_deg`, `angular_difference_deg`, `destination_point` | Great-circle helpers, numpy-vectorised. |

Constants (weights, thresholds, defaults, the demo scenario) are all at the top of
`attribution.py`, named and grouped — tune there, not inline.

## Backend integration

`rank_vessels()` is the only symbol the backend needs from this module. The three
stages chain like this:

```python
from datetime import timedelta
import pandas as pd

from ml.detection.detection import predict_oil_spill   # Stage 1
from ml.drift_trace.drift_trace import trace_origin    # Stage 2
from ml.attribution.attribution import rank_vessels    # Stage 3

mask   = predict_oil_spill(image_path, model, device)
origin = trace_origin(detection_lon, detection_lat, detection_time)

# Stage 2 returns a single best-estimate release time, not a window. Stage 3 wants
# a window, so widen it by the uncertainty you are willing to accept - three hours
# either side is the demo default (see DEMO_SPILL_WINDOW).
origin_time = pd.to_datetime(origin["estimated_origin_time"])
suspects = rank_vessels(
    ais_df="ml/attribution/data/synthetic_ais_persian_gulf.csv",
    origin_lon=origin["estimated_origin_lon"],
    origin_lat=origin["estimated_origin_lat"],
    time_window_start=origin_time - timedelta(hours=3),
    time_window_end=origin_time + timedelta(hours=3),
)
return suspects            # already JSON-serialisable
```

Stage 2's contract, as currently implemented in `drift_trace_pipeline.ipynb`, is
`{estimated_origin_lon, estimated_origin_lat, estimated_origin_time,
stranded_early}`. Two things follow: the window has to be built from
`estimated_origin_time` as above, and **`stranded_early=True` is worth passing
through to the response** — it means the backward trace hit the coast before
completing, so the origin estimate is a lower bound on the drift and the AIS window
is correspondingly less trustworthy.

Notes for whoever wires up `/rank-vessels`:

- **An empty list is a valid answer**, not an error — it means no vessel was inside
  the search window. Surface it as "no candidates found", and consider retrying with
  a larger `radius_km` rather than treating it as a failure.
- **`ValueError` means the input was unusable** — required columns missing, an empty
  frame, or a bad `weights` dict. Map it to a 4xx, not a 500.
- **Warnings, not exceptions, signal degraded input** (missing optional columns,
  dropped rows). They are Python `warnings`, so `logging.captureWarnings(True)` will
  route them into the API log.
- **`max_results`** keeps the response small for the map panel; leave it unset when
  the frontend wants the full candidate list.
- The call is CPU-bound and synchronous but sub-second at demo scale; it does not
  need a background task queue. Feeding it a real multi-hundred-MB daily AIS file
  does — pre-filter that to the region and day first.

## Scoring methodology

Two stages, for speed: a **filter** cuts the fleet down to plausible candidates,
then a **scorer** examines each candidate's track in detail.

### 1. Filtering

Keep a vessel if any of its reports fall inside
`[window_start − 6 h, window_end + 6 h]` **and** within `radius_km` (default 50 km)
of the origin. Cheap time and bounding-box tests run first; exact haversine
distance is computed only on what survives.

Once a vessel qualifies, **its whole in-window track is returned — not just the
reports inside the radius.** The anomaly scan needs to see the approach and the
departure to recognise a slow-down or a turn.

### 2. Scoring

Four factors, each normalised to 0–1, combined as a weighted sum:

| Factor | Weight | What it measures | How it is computed |
|---|---:|---|---|
| **Proximity** | **35%** | Was the vessel actually there? | Closest reported approach to the origin. `1.0` at ≤1 km, falling linearly to `0.0` at 50 km. |
| **Trajectory** | **30%** | Did its course point at the origin, or was it just passing? | Smallest angle, over the vessel's *approach* to the origin, between its course and the bearing to the origin. `1.0` at 0° off, falling linearly to `0.0` at 90° off. Reports farther than 60 km are ignored — from far enough away almost any course points roughly at the origin. |
| **Anomaly** | **25%** | Did it behave like a vessel discharging oil? | Three sub-signals, below. |
| **Vessel type** | **10%** | Is it the kind of ship that carries oil? | Lookup: tanker `1.0`, cargo `0.8`, towing `0.5`, other `0.3`, fishing `0.25`, passenger `0.2`, pleasure/sailing `0.15`, military `0.1`. Unknown type → `0.4`. |

**Why these weights.** Proximity is the strongest single piece of evidence — a ship
that was not there cannot have done it — so it leads, but it is deliberately kept
under half the total, because *being nearby is not incriminating* in a busy
shipping lane. Trajectory is nearly as heavily weighted because it is what separates
a vessel that crossed the release point from one that merely passed within 20 km.
Anomaly gets a full quarter: it is the only factor that reflects *behaviour*
rather than geometry, and it is what distinguishes the culprit from equally close,
equally well-aligned innocent traffic — in the demo run it is the largest single
contributor to the gap between #1 and #2. Vessel type is capped at 10% on purpose:
it is a prior, not evidence. Weighting it higher would rank every tanker in the
region above a small vessel that was demonstrably at the origin, which is exactly
the profiling failure mode to avoid.

These are documented defaults, not tuned parameters — there is no labelled corpus
of real attributed spills to tune against. They are exposed as
`WEIGHT_PROXIMITY`, `WEIGHT_TRAJECTORY`, `WEIGHT_ANOMALY`, `WEIGHT_VESSEL_TYPE`,
and per-call via `weights=`.

### The anomaly sub-signals

Scanned over the release window ±3 h. Combined as a weighted sum:

| Sub-signal | Weight | Rationale | Scale |
|---|---:|---|---|
| **AIS gap** | **40%** | A vessel that stops broadcasting around the release time and place is the classic illicit-discharge signature. Absence of data is itself the evidence. | Longest silence: `0.0` at ≤30 min, rising to `1.0` at ≥120 min |
| **Speed drop** | **35%** | Discharge is usually done slowly; a sharp slow-down near the origin is consistent with it. | Largest drop between consecutive reports: `1.0` at ≥8 knots |
| **Course change** | **25%** | Turning away right after passing the release point. | Largest change between consecutive reports: `1.0` at ≥60° |

**Interval guard.** A speed drop or course change only counts if the two reports
are **≤30 minutes apart**. Without this, a vessel that goes dark for two hours and
reappears slower and on a new heading would be scored as if it had braked and
turned abruptly — double-counting the same gap. The guard means a change across a
long silence is credited to the gap signal alone.

A vessel with a steady track scores exactly `0.0` here; acceleration is not a drop.

### Explainability

Every sub-score reports the raw magnitude behind it — `closest_distance_km`,
`best_alignment_deg`, `speed_drop_knots`, `course_change_deg`,
`max_ais_gap_minutes` — so a reviewer can see *why* a vessel ranked where it did
and disagree with the reasoning rather than just the number. The notebook renders
this as a factor breakdown with each term's weighted contribution.

## Demo scenario and results

The demo reuses Stage 2's Persian Gulf case for narrative continuity — the same
region Stage 1's Sentinel-1 training imagery covers, so all three stages work over
the same water. Estimated origin **51.50 °E, 26.50 °N**, estimated release
**2026-08-26 12:00 UTC** (window 09:00–15:00), region 50.7–52.7 °E / 26.1–27.3 °N
— open Gulf water north of the Qatar peninsula — with the AIS feed spanning origin
±12 h at a 10-minute reporting cadence.

**2,787 reports from 20 vessels → 13 candidates after filtering → ranked:**

| Rank | Vessel | MMSI | Score | Proximity | Trajectory | Anomaly | Type |
|---:|---|---|---:|---:|---:|---:|---:|
| **1** | **MT KAVERI** (tanker) | 251765553 | **0.941** | 0.954 | 0.999 | 0.828 | 1.000 |
| 2 | MS MEGHNA (passenger) | 327121000 | 0.646 | 0.808 | 0.900 | 0.294 | 0.200 |

MT KAVERI is the vessel the generator planted, and it comes out **+0.294 clear of
the runner-up**. Its evidence: closest reported approach **3.24 km at 11:30**, a
course on the run-in that was **0.12° off** the bearing to the origin, a
**7.5-knot** speed drop, a **56°** turn, and a **90-minute AIS gap** straight over
the release point. The runner-up is close and reasonably well-aligned too — what
separates them is behaviour: 0.294 anomaly against 0.828.

That 3.24 km is worth reading carefully — it is not a miss. The vessel goes dark
*at* the origin, so its last report before the silence is 3.24 km short of it. The
system never sees it at 0 km; it infers the approach from the track and the gap.
That is precisely the situation the anomaly term exists to catch, and it is what
real illicit-discharge tracks look like.

### Validation

None of this is a single-scenario fluke. The notebook re-runs the pipeline under
stress in five checks — randomised scenarios, origin error, window shift, factor
ablation, degraded schemas — and the full tables are saved to
`attribution_results.json`.

**Randomised scenarios** — 25 different seeds (different fleets, tracks, culprits):
**25/25 top-1 accuracy**, mean margin over the runner-up **+0.266**, worst margin
**+0.194**.

**Fleet size and speed** — a standalone timing run (not one of the notebook's
five checks): 5 → 200 vessels, culprit ranked #1 at every size with an unchanged
0.940 score; 200 vessels / 28,752 reports filtered and scored in **0.29 s**. The
work is vectorised numpy over a DataFrame, so cost grows with the number of
reports, not with anything expensive.

**Tolerance to Stage 2 error** — the culprit still ranks #1 with the origin
displaced up to **20 km** (score 0.941 → 0.865), slipping to rank 2 only at **40 km**
(0.734), and with the window slid **±6 h** (0.941 → 0.79/0.82). At **+9 h** it falls
to **rank 9**: the anomaly scan no longer overlaps the discharge, so the behavioural
evidence disappears. Stage 2's timing matters more than its positioning — which is
reassuring, since the drift trace localises the release point better than the release
instant.

**Factor ablation** — anomaly alone separates the culprit best (margin +0.530),
proximity alone +0.110, trajectory alone +0.099; **vessel type alone separates
nothing** — margin 0.000, because three other tankers in the candidate set tie with
the culprit at 1.0. That is the empirical reason the type prior is held at 10%.

**Degraded schemas** — the culprit still ranks #1 with only `MMSI/BaseDateTime/
LAT/LON` (score 0.798, course derived from consecutive positions), with no `SOG`
(0.859), and with no `VesselType` (0.881). The pipeline degrades in score, not in
correctness.

## Swapping in real AIS data

Nothing in the scoring assumes synthetic input. The demo feed is synthetic only
because real AIS for this region and window was not obtainable in the hackathon
timeframe — the problem statement explicitly allows synthetic AIS for demonstration.
To switch to real data:

**1. Download it.** [marinecadastre.gov/accessais](https://marinecadastre.gov/accessais)
publishes US Coast Guard AIS as daily CSVs (`AIS_YYYY_MM_DD.csv`), already in the
`MMSI, BaseDateTime, LAT, LON, SOG, COG, Heading, VesselName, VesselType, Length,
Draft, Status` schema this module expects. For non-US waters (the Persian Gulf case
here), a commercial or regional feed is needed — AISHub, Spire, or a national
maritime authority.

**2. Point `rank_vessels` at it.** No code change:

```python
suspects = attribution.rank_vessels(
    "data/AIS_2026_08_26.csv", 51.50, 26.50,
    "2026-08-26 09:00", "2026-08-26 15:00", radius_km=50,
)
```

**3. What the loader handles for you.**
- **Column naming.** ~30 aliases are mapped automatically — `timestamp`/`datetime`/
  `time` → `BaseDateTime`, `latitude`/`longitude` → `LAT`/`LON`, `speed` → `SOG`,
  `course` → `COG`, `shipname` → `VesselName`, `shiptype` → `VesselType`,
  `navstatus` → `Status`, and so on, case- and separator-insensitive.
- **Required columns.** `MMSI`, `BaseDateTime`, `LAT`, `LON` — missing any of these
  raises. Everything else is optional: the loader warns, and the affected sub-score
  degrades rather than the run failing.
- **AIS "not available" sentinels.** `SOG ≥ 102.2`, `COG ≥ 360` and
  `Heading = 511` become `NaN` instead of being scored as real values, as do
  impossible coordinates (`|LAT| > 90`, `|LON| > 180`).
- **Timestamps.** Parsed with `pd.to_datetime`; unparseable rows dropped with a
  warning naming the count. Real feeds are UTC — keep Stage 2's window in UTC too,
  since a timezone mismatch silently shifts the anomaly scan (see the window-shift
  result above).
- **MMSI.** Normalised to a clean string, so a column pandas read as float64
  (because one row was blank) still yields `"367001234"`, not `"367001234.0"`.
  Rows with no usable MMSI are dropped rather than becoming a vessel named `nan`.
- **Row order.** Sorted by MMSI then time, index reset — the scoring assumes each
  vessel's reports are in chronological order.

**4. Retune two things for a real feed.**
- `AIS_GAP_MIN_MINUTES` / `AIS_GAP_FULL_SCORE_MINUTES` (30/120) assume a ~10-minute
  cadence. A feed reporting every 30–60 minutes will flag normal traffic as going
  dark. Set the minimum above the feed's own median interval.
- `SPEED_DROP_MAX_INTERVAL_MINUTES` / `COURSE_CHANGE_MAX_INTERVAL_MINUTES` (30) —
  same reasoning, these guard against reading a change across a silence as an
  abrupt manoeuvre.

**5. Cache downloads.** Per `CLAUDE.md`, keep raw AIS files on disk under `data/`
and read from there — real daily files are hundreds of MB and the sources are slow
and rate-limited. Filter to the region and day you need once, save the subset, and
work from the subset.

## Known limitations

Stated plainly, because they matter more than the demo score:

1. **The AIS data is synthetic.** The planted culprit makes the scoring *testable* —
   it proves the logic ranks a known-guilty track first, across 25 randomised
   scenarios and several degraded schemas. It does **not** prove accuracy on real
   traffic, which is denser, messier, and has no ground truth.
2. **The synthetic scenario is easier than reality by construction.** Distractor
   tracks are re-rolled if they come within 8 km of the origin
   (`SYNTHETIC_MIN_DISTRACTOR_DISTANCE_KM`), so exactly one vessel has a genuinely
   close approach. Real shipping lanes produce several plausible candidates and a
   much narrower margin than the +0.294 here.
3. **Attribution is probabilistic, never an identification.** The output is a
   ranked list of vessels whose tracks are *consistent with* the spill — grounds to
   investigate, not evidence of guilt. Any interface built on this must present it
   that way, scores and factor breakdown visible.
4. **A vessel that never broadcasts cannot be ranked at all.** AIS is
   self-reported and can be switched off before the discharge rather than during it.
   The gap signal catches a vessel that goes dark *mid-track*; a vessel dark the
   whole time is simply absent from the input, and its absence is invisible.
5. **Accuracy is bounded by Stage 2.** 40 km of origin error costs the culprit
   0.94 → 0.74 and second place; a window slid 9 h late — past the discharge
   entirely — drops it to **rank 9**. Stage 3
   cannot be more accurate than the origin estimate it is given, and it has no way
   to detect that the estimate was wrong — it will rank confidently around a bad
   origin. If Stage 2 reports `stranded_early`, treat the ranking as weak evidence.
6. **The weights are reasoned defaults, not fitted.** There is no labelled corpus
   of real attributed spills to tune against. The ablation table shows which factors
   do the work, but the exact 35/30/25/10 split is a judgement call, documented as
   one.
7. **No course information → trajectory scores 0.0**, not a neutral 0.5. If a feed
   has no `COG`, no `Heading`, and single-report tracks, those vessels are penalised
   rather than scored neutrally. Deliberate — an unverifiable factor should not
   inflate a suspect score — but it means sparse tracks rank low for a reason
   unrelated to innocence. Relatedly, a vessel whose closest approach is its *first*
   in-window report has only that one report on its approach, so its trajectory score
   rests on a single COG reading — FV CASPIAN and FV ARABIAN score 0.000 in the demo
   for exactly this reason, despite both reporting a valid COG. Widening
   `time_buffer_hours` gives such a vessel more track to be judged on.

## Design notes

- **Rule-based, not a trained model** — intentional. There is no training corpus of
  attributed spills, and a black-box score is the wrong tool for evidence that a
  human investigator has to act on and defend. Every number here is traceable to a
  measured quantity. If labelled data ever exists, the sub-scores are the natural
  feature vector for a learned ranker.
- **Interface stability.** `rank_vessels()` keeps its signature and dict keys
  regardless of what changes inside, so the backend integration does not move.
  Sub-scores are additive-only extensions.
- **No hidden state.** No globals mutated, no caching between calls, no I/O except
  the optional CSV read — the same inputs always give the same output, which is what
  makes the validation table meaningful.
