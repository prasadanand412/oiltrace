"""Stage 3 - AIS-based vessel attribution for OilTrace (SIH 2026, PS SIH26143).

Given an estimated spill origin (lon/lat) and an estimated origin time window -
the output of Stage 2's backward drift trace - this module filters historical
AIS ship-tracking data down to the vessels that were nearby, scores each of them
on four independent factors, and returns a ranked, explainable suspect list.

    import attribution

    ranked = attribution.rank_vessels(
        ais_df,
        origin_lon=51.50,
        origin_lat=26.50,
        time_window_start="2026-08-26 09:00",
        time_window_end="2026-08-26 15:00",
    )
    ranked[0]["VesselName"], ranked[0]["combined_score"]

Public API - the backend integrates against these five functions, whose
signatures are intended to stay stable:

    load_ais_data(filepath)               CSV path -> cleaned DataFrame
    generate_synthetic_ais_data(...)      -> (DataFrame, ground_truth dict)
    filter_candidate_vessels(...)         -> DataFrame of nearby vessels' rows
    score_vessel(...)                     -> dict of sub-scores + combined score
    rank_vessels(...)                     -> list of dicts, best suspect first

Attribution is probabilistic. The output is a ranked list of candidates with a
transparent score breakdown, never a definitive identification. See README.md
for the scoring methodology, the weight rationale and the known limitations.

Run "python attribution.py" to execute the built-in self-test, which builds a
synthetic scenario with one planted suspect and checks that it ranks first.
"""

from __future__ import annotations

import warnings
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Scoring weights
# ---------------------------------------------------------------------------
# The four top-level factors. Tune them here, never inline at the call site.
# The rationale for these defaults is documented in README.md.

WEIGHT_PROXIMITY = 0.35
WEIGHT_TRAJECTORY = 0.30
WEIGHT_ANOMALY = 0.25
WEIGHT_VESSEL_TYPE = 0.10

DEFAULT_WEIGHTS = {
    "proximity": WEIGHT_PROXIMITY,
    "trajectory": WEIGHT_TRAJECTORY,
    "anomaly": WEIGHT_ANOMALY,
    "vessel_type": WEIGHT_VESSEL_TYPE,
}

# ---------------------------------------------------------------------------
# Candidate filtering defaults
# ---------------------------------------------------------------------------

DEFAULT_RADIUS_KM = 50.0
DEFAULT_TIME_BUFFER_HOURS = 6.0

# ---------------------------------------------------------------------------
# Proximity scoring
# ---------------------------------------------------------------------------
# Closest reported approach to the estimated origin, scored on a straight line:
# at or inside PROXIMITY_FULL_SCORE_KM -> 1.0, at or beyond
# PROXIMITY_ZERO_SCORE_KM -> 0.0, linear in between.

PROXIMITY_FULL_SCORE_KM = 1.0
PROXIMITY_ZERO_SCORE_KM = 50.0

# ---------------------------------------------------------------------------
# Trajectory scoring
# ---------------------------------------------------------------------------
# Compares the vessel's course against the bearing from the vessel to the
# origin, over the approach phase only (the reports up to and including the
# closest approach). Dead on for the origin scores 1.0, and the score falls away
# linearly to 0.0 at TRAJECTORY_ZERO_SCORE_DEG off: a vessel crossing the origin's
# bearing at a right angle was not heading there, so it earns nothing here.
# TRAJECTORY_MAX_RANGE_KM ignores reports so distant that their bearing to the
# origin carries no real information.

TRAJECTORY_ZERO_SCORE_DEG = 90.0
TRAJECTORY_MAX_RANGE_KM = 60.0

# ---------------------------------------------------------------------------
# Behavioural anomaly scoring
# ---------------------------------------------------------------------------
# Three independent red flags, combined with the sub-weights below. Each is
# measured only over reports near the estimated spill time (the origin window
# widened by ANOMALY_SCAN_BUFFER_HOURS on each side).

ANOMALY_SUB_WEIGHTS = {
    "speed_drop": 0.35,
    "course_change": 0.25,
    "ais_gap": 0.40,
}

SPEED_DROP_FULL_SCORE_KNOTS = 8.0
SPEED_DROP_MAX_INTERVAL_MINUTES = 30.0

COURSE_CHANGE_FULL_SCORE_DEG = 60.0
COURSE_CHANGE_MAX_INTERVAL_MINUTES = 30.0

# Tune these two to the reporting cadence of the AIS feed actually in use. The
# defaults suit a feed that normally reports every few minutes.
AIS_GAP_MIN_MINUTES = 30.0
AIS_GAP_FULL_SCORE_MINUTES = 120.0

ANOMALY_SCAN_BUFFER_HOURS = 3.0

# ---------------------------------------------------------------------------
# Vessel type scoring
# ---------------------------------------------------------------------------
# Tankers and cargo ships are the dominant sources of operational discharge, so
# they are weighted up. This is deliberately the weakest of the four factors
# (10%): it is a prior about vessel classes, not evidence about this spill.

VESSEL_TYPE_SCORES = {
    "tanker": 1.00,
    "cargo": 0.80,
    "towing": 0.50,
    "other": 0.30,
    "fishing": 0.25,
    "passenger": 0.20,
    "pleasure": 0.15,
    "sailing": 0.15,
    "military": 0.10,
}

DEFAULT_VESSEL_TYPE_SCORE = 0.40  # used when VesselType is absent or unreadable

# ---------------------------------------------------------------------------
# AIS schema
# ---------------------------------------------------------------------------

REQUIRED_COLUMNS = ("MMSI", "BaseDateTime", "LAT", "LON")
OPTIONAL_COLUMNS = (
    "SOG",
    "COG",
    "Heading",
    "VesselName",
    "VesselType",
    "Length",
    "Draft",
    "Status",
)
AIS_COLUMNS = REQUIRED_COLUMNS + OPTIONAL_COLUMNS

NUMERIC_COLUMNS = ("LAT", "LON", "SOG", "COG", "Heading", "Length", "Draft")

# Column names seen in the wild, mapped onto the canonical schema above. Keys
# are matched case-insensitively with spaces and underscores stripped out.
COLUMN_ALIASES = {
    "mmsi": "MMSI",
    "basedatetime": "BaseDateTime",
    "timestamp": "BaseDateTime",
    "datetime": "BaseDateTime",
    "time": "BaseDateTime",
    "lat": "LAT",
    "latitude": "LAT",
    "lon": "LON",
    "long": "LON",
    "longitude": "LON",
    "sog": "SOG",
    "speed": "SOG",
    "speedoverground": "SOG",
    "cog": "COG",
    "course": "COG",
    "courseoverground": "COG",
    "heading": "Heading",
    "trueheading": "Heading",
    "vesselname": "VesselName",
    "shipname": "VesselName",
    "name": "VesselName",
    "vesseltype": "VesselType",
    "shiptype": "VesselType",
    "type": "VesselType",
    "length": "Length",
    "draft": "Draft",
    "draught": "Draft",
    "status": "Status",
    "navstatus": "Status",
    "navigationalstatus": "Status",
}

# AIS "value not available" sentinels, which must not be read as real data.
SOG_NOT_AVAILABLE = 102.2  # 102.3 is the sentinel; anything at/above is invalid
COG_NOT_AVAILABLE = 360.0  # 360 or above means unavailable
HEADING_NOT_AVAILABLE = 511.0  # exactly 511 means unavailable

# ---------------------------------------------------------------------------
# Demo scenario - kept in step with Stage 2's drift-trace demo (Persian Gulf)
# ---------------------------------------------------------------------------
# The Persian Gulf is the region Stage 1's Sentinel-1 training imagery covers, so
# all three stages demo over the same water. Stage 2 seeds a detection at
# 51.50E / 26.50N on 2026-08-27 12:00 and traces 24 h backward, which puts its
# estimated origin time at 2026-08-26 12:00. Stage 3's demo defaults reuse those
# numbers so the pipeline demos as one story.
#
# Stage 2's run against real Copernicus currents estimates the origin slightly
# off the seeded point, at 51.6510E / 26.4615N (stranded_early: False); a fully
# chained demo feeds that through. These defaults use the round seeded point so
# the scenario is reproducible without re-running the drift simulation.

DEMO_ORIGIN_LON = 51.50
DEMO_ORIGIN_LAT = 26.50
DEMO_ORIGIN_TIME = datetime(2026, 8, 26, 12, 0)

# (lon_min, lat_min, lon_max, lat_max) - roughly 200 km x 133 km of open Gulf
# water, north of the Qatar peninsula and Bahrain, south of the Iranian coast.
DEMO_REGION_BOUNDS = (50.70, 26.10, 52.70, 27.30)

# Span of AIS history to synthesise, and the origin-time uncertainty window that
# Stage 2 would hand to Stage 3.
DEMO_AIS_TIME_WINDOW = (
    DEMO_ORIGIN_TIME - timedelta(hours=12),
    DEMO_ORIGIN_TIME + timedelta(hours=12),
)
DEMO_SPILL_WINDOW = (
    DEMO_ORIGIN_TIME - timedelta(hours=3),
    DEMO_ORIGIN_TIME + timedelta(hours=3),
)

# ---------------------------------------------------------------------------
# Synthetic data generation
# ---------------------------------------------------------------------------

SYNTHETIC_REPORT_INTERVAL_MINUTES = 10.0
KNOTS_TO_KM_PER_HOUR = 1.852

# A distractor vessel that strayed this close to the origin would make the test
# scenario ambiguous, so its track is re-rolled. Discussed in README.md.
SYNTHETIC_MIN_DISTRACTOR_DISTANCE_KM = 8.0

EARTH_RADIUS_KM = 6371.0088


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------


def haversine_km(lon1, lat1, lon2, lat2):
    """Great-circle distance in kilometres between two points on Earth.

    Args:
        lon1, lat1: Longitude/latitude of the first point, in degrees. Scalars
            or numpy-compatible arrays.
        lon2, lat2: Longitude/latitude of the second point, in degrees.

    Returns:
        Distance in km. A numpy scalar for scalar input, an array otherwise.
    """
    lon1, lat1, lon2, lat2 = (
        np.radians(np.asarray(value, dtype=float))
        for value in (lon1, lat1, lon2, lat2)
    )
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    inner = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    return 2.0 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(np.clip(inner, 0.0, 1.0)))


def bearing_deg(lon1, lat1, lon2, lat2):
    """Initial great-circle bearing from point 1 to point 2.

    Args:
        lon1, lat1: Longitude/latitude of the point being travelled from.
        lon2, lat2: Longitude/latitude of the point being travelled towards.

    Returns:
        Compass bearing in degrees, 0-360, where 0 is north and 90 is east.
    """
    lon1, lat1, lon2, lat2 = (
        np.radians(np.asarray(value, dtype=float))
        for value in (lon1, lat1, lon2, lat2)
    )
    dlon = lon2 - lon1
    y = np.sin(dlon) * np.cos(lat2)
    x = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon)
    return np.degrees(np.arctan2(y, x)) % 360.0


def angular_difference_deg(angle_a, angle_b):
    """Smallest absolute difference between two compass angles, in 0-180 degrees.

    Handles the wrap-around at 360 degrees, so 350 and 10 differ by 20, not 340.
    """
    difference = np.abs(np.asarray(angle_a, dtype=float) - np.asarray(angle_b, dtype=float)) % 360.0
    return np.where(difference > 180.0, 360.0 - difference, difference)


def destination_point(lon, lat, bearing_degrees, distance_km):
    """Point reached by travelling a given bearing and distance from a start point.

    The inverse of bearing_deg/haversine_km; used to lay out synthetic vessel
    tracks along a chosen course.

    Args:
        lon, lat: Starting longitude/latitude in degrees.
        bearing_degrees: Compass bearing to travel along, 0 = north.
        distance_km: Distance to travel, in kilometres.

    Returns:
        (lon, lat) tuple of floats, in degrees.
    """
    lat_rad = np.radians(float(lat))
    lon_rad = np.radians(float(lon))
    bearing_rad = np.radians(float(bearing_degrees))
    angular_distance = float(distance_km) / EARTH_RADIUS_KM

    destination_lat = np.arcsin(
        np.sin(lat_rad) * np.cos(angular_distance)
        + np.cos(lat_rad) * np.sin(angular_distance) * np.cos(bearing_rad)
    )
    destination_lon = lon_rad + np.arctan2(
        np.sin(bearing_rad) * np.sin(angular_distance) * np.cos(lat_rad),
        np.cos(angular_distance) - np.sin(lat_rad) * np.sin(destination_lat),
    )
    # Normalise longitude back into -180..180.
    destination_lon = (destination_lon + 3.0 * np.pi) % (2.0 * np.pi) - np.pi
    return float(np.degrees(destination_lon)), float(np.degrees(destination_lat))


# ---------------------------------------------------------------------------
# Loading and cleaning AIS data
# ---------------------------------------------------------------------------


def _canonical_key(column_name):
    """Reduce a column name to its lookup key: lowercase, no spaces or underscores."""
    return str(column_name).strip().lower().replace("_", "").replace(" ", "").replace("-", "")


def _rename_to_canonical_schema(ais_df):
    """Rename recognised column aliases onto the canonical AIS schema.

    Columns that are already canonical are left alone. Unrecognised columns are
    kept as-is - extra columns are harmless, and dropping them would throw away
    data the caller may want (IMO number, call sign, cargo code and so on).
    """
    renames = {}
    for column in ais_df.columns:
        if column in AIS_COLUMNS:
            continue
        canonical = COLUMN_ALIASES.get(_canonical_key(column))
        # Only rename if the canonical name is not already taken by another column.
        if canonical is not None and canonical not in ais_df.columns and canonical not in renames.values():
            renames[column] = canonical
    return ais_df.rename(columns=renames) if renames else ais_df


def _clean_mmsi(mmsi_series):
    """Normalise the MMSI column to clean strings, keeping missing values missing.

    MMSI is an identifier, not a quantity, so it is carried as a string: that
    survives a JSON round-trip to the frontend unchanged and cannot pick up
    float formatting. Integer-valued MMSIs are formatted without a decimal
    point, so a column that pandas read as float64 (because it contained a
    blank) still yields "367001234" rather than "367001234.0".
    """
    numeric = pd.to_numeric(mmsi_series, errors="coerce")
    text = mmsi_series.astype(str).str.strip()

    # Keep genuinely-absent identifiers absent whatever astype(str) made of
    # them, so the row is dropped later instead of becoming a vessel named "nan".
    text = text.mask(mmsi_series.isna() | text.isin(["", "nan", "None", "<NA>", "NaN"]))

    integral = numeric.notna() & (numeric % 1 == 0)
    if integral.any():
        text.loc[integral] = numeric[integral].astype("int64").astype(str)
    return text


def prepare_ais_dataframe(ais_df, source="<dataframe>"):
    """Clean and type-normalise a raw AIS DataFrame against the canonical schema.

    Both load_ais_data() and generate_synthetic_ais_data() run their output
    through here, so a synthetic frame and a real one behave identically
    downstream. Safe to call again on an already-prepared frame.

    Cleaning performed, in order:
      1. Recognised column aliases are renamed (LATITUDE -> LAT, and so on).
      2. Missing required columns raise ValueError; missing optional ones are
         created empty, with a warning naming them.
      3. BaseDateTime is parsed to datetime64; numeric columns are coerced.
      4. AIS "not available" sentinels (SOG 102.3, COG 360, Heading 511) and
         impossible coordinates become NaN.
      5. Rows missing any required field are dropped, with a warning.
      6. Rows are sorted by MMSI then BaseDateTime, and the index is reset.

    Args:
        ais_df: Raw DataFrame, in any column order, with any extra columns.
        source: Label used in warning messages, e.g. the source file path.

    Returns:
        A new cleaned DataFrame. MMSI is a string (so it survives JSON
        round-trips without turning into a float), BaseDateTime is datetime64,
        and every column in NUMERIC_COLUMNS is float.

    Raises:
        ValueError: if any of MMSI, BaseDateTime, LAT or LON is missing, or if
            no usable rows remain after cleaning.
    """
    ais_df = _rename_to_canonical_schema(pd.DataFrame(ais_df).copy())

    missing_required = [column for column in REQUIRED_COLUMNS if column not in ais_df.columns]
    if missing_required:
        raise ValueError(
            f"{source}: AIS data is missing required column(s) "
            f"{missing_required}. Required: {list(REQUIRED_COLUMNS)}. "
            f"Found: {list(ais_df.columns)}."
        )

    missing_optional = [column for column in OPTIONAL_COLUMNS if column not in ais_df.columns]
    if missing_optional:
        warnings.warn(
            f"{source}: optional AIS column(s) {missing_optional} not present - "
            f"scoring will fall back to defaults for these. "
            f"Present: {[c for c in AIS_COLUMNS if c in ais_df.columns]}.",
            stacklevel=2,
        )
        for column in missing_optional:
            ais_df[column] = np.nan

    ais_df["MMSI"] = _clean_mmsi(ais_df["MMSI"])

    ais_df["BaseDateTime"] = pd.to_datetime(ais_df["BaseDateTime"], errors="coerce")

    for column in NUMERIC_COLUMNS:
        ais_df[column] = pd.to_numeric(ais_df[column], errors="coerce")

    # Drop AIS "value not available" sentinels rather than scoring against them.
    ais_df.loc[ais_df["SOG"] >= SOG_NOT_AVAILABLE, "SOG"] = np.nan
    ais_df.loc[ais_df["COG"] >= COG_NOT_AVAILABLE, "COG"] = np.nan
    ais_df.loc[ais_df["Heading"] == HEADING_NOT_AVAILABLE, "Heading"] = np.nan

    # Impossible coordinates: treat as missing so the row is dropped below.
    ais_df.loc[ais_df["LAT"].abs() > 90.0, "LAT"] = np.nan
    ais_df.loc[ais_df["LON"].abs() > 180.0, "LON"] = np.nan

    rows_before = len(ais_df)
    ais_df = ais_df.dropna(subset=list(REQUIRED_COLUMNS))
    rows_dropped = rows_before - len(ais_df)
    if rows_dropped:
        warnings.warn(
            f"{source}: dropped {rows_dropped} of {rows_before} row(s) with a "
            f"missing or unparseable MMSI, BaseDateTime, LAT or LON.",
            stacklevel=2,
        )

    if ais_df.empty:
        raise ValueError(f"{source}: no usable AIS rows remain after cleaning.")

    ais_df = ais_df.sort_values(["MMSI", "BaseDateTime"]).reset_index(drop=True)

    # Put the canonical columns first, keeping any extras after them.
    ordered = [c for c in AIS_COLUMNS if c in ais_df.columns]
    extras = [c for c in ais_df.columns if c not in ordered]
    return ais_df[ordered + extras]


def load_ais_data(filepath):
    """Load an AIS CSV into a cleaned, canonically-typed pandas DataFrame.

    Written against the marinecadastre.gov/accessais schema (MMSI, BaseDateTime,
    LAT, LON, SOG, COG, Heading, VesselName, VesselType, Length, Draft, Status),
    but tolerant of the common column-name variants listed in COLUMN_ALIASES and
    of datasets that only carry a subset of the optional columns.

    Args:
        filepath: Path to a CSV file, as str or pathlib.Path.

    Returns:
        A cleaned DataFrame - see prepare_ais_dataframe() for exactly what
        cleaning is applied. Missing optional columns are created empty and a
        warning names them.

    Raises:
        FileNotFoundError: if filepath does not exist.
        ValueError: if a required column (MMSI, BaseDateTime, LAT, LON) is
            missing, or if no usable rows survive cleaning.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"AIS file not found: {filepath}")

    raw = pd.read_csv(filepath)
    return prepare_ais_dataframe(raw, source=str(filepath))


# ---------------------------------------------------------------------------
# Synthetic AIS data (for testing the scoring logic against a known answer)
# ---------------------------------------------------------------------------

# Speed bands in knots (cruise low, cruise high) by vessel class, plus the share
# of the fleet each class makes up. Roughly representative of coastal traffic.
SYNTHETIC_VESSEL_CLASSES = (
    ("tanker", 9.0, 15.0, 0.20),
    ("cargo", 10.0, 18.0, 0.30),
    ("fishing", 2.0, 8.0, 0.30),
    ("passenger", 14.0, 25.0, 0.20),
)

SYNTHETIC_NAME_PREFIXES = {
    "tanker": "MT",
    "cargo": "MV",
    "fishing": "FV",
    "passenger": "MS",
}

SYNTHETIC_NAME_WORDS = (
    "ARABIAN", "KONKAN", "SAGAR", "MEGHNA", "TAPTI", "GODAVARI", "NARMADA",
    "VINDHYA", "MALABAR", "CORAL", "MONSOON", "TRIDENT", "ORION", "PELAGIC",
    "HORIZON", "MERIDIAN", "AURORA", "ATLAS", "CASPIAN", "SIROCCO", "ZEPHYR",
    "KAVERI", "SATPURA", "NILGIRI", "DECCAN", "MANDOVI", "ZUARI", "KALYAN",
)

# --- Planted-suspect behaviour profile -------------------------------------
# The one vessel the synthetic scenario is built around. It steams straight at
# the origin, slows to a crawl while it discharges, goes dark over the origin
# time, then reappears, turns away and accelerates. That is the textbook
# operational-discharge signature the scoring is meant to catch, so it exercises
# proximity, trajectory and all three anomaly signals at once.

SUSPECT_APPROACH_HOURS = 4.0  # length of the inbound leg before the origin time
SUSPECT_DEPART_HOURS = 4.0  # length of the outbound leg after it
SUSPECT_SLOWDOWN_HOURS = 1.0  # slows to discharge speed this long before origin
SUSPECT_TURN_HOURS = 1.5  # turns away and accelerates this long after origin
SUSPECT_DARK_START_HOURS = 0.5  # AIS falls silent this long before the origin
SUSPECT_DARK_END_HOURS = 1.0  # ... and resumes this long after it
SUSPECT_CRUISE_SOG = 11.0
SUSPECT_DISCHARGE_SOG = 3.5
SUSPECT_ESCAPE_SOG = 14.0
SUSPECT_COURSE_CHANGE_DEG = 55.0

# --- Distractor behaviour --------------------------------------------------
# Distractors are not perfectly clean: some turn, some go briefly dark, some sit
# at anchor. Without that the test would be trivially easy and would not show
# that the weighting actually discriminates.

DISTRACTOR_ANCHORED_PROBABILITY = 0.10
DISTRACTOR_TURN_PROBABILITY = 0.35
DISTRACTOR_TURN_RANGE_DEG = (15.0, 35.0)
DISTRACTOR_GAP_PROBABILITY = 0.25
DISTRACTOR_GAP_MINUTES = 40.0
DISTRACTOR_MAX_TRACK_ATTEMPTS = 60


def _report_times(start_time, end_time, interval_minutes):
    """Evenly spaced report timestamps from start_time to end_time inclusive."""
    step = timedelta(minutes=float(interval_minutes))
    times = []
    current = start_time
    while current <= end_time:
        times.append(current)
        current = current + step
    return times


def _synthetic_vessel_identity(rng, used_mmsis, used_names, force_class=None):
    """Draw an unused (mmsi, name, vessel_class) triple for a synthetic vessel.

    force_class pins the class (the planted suspect is always a tanker); otherwise
    it is drawn from the fleet mix in SYNTHETIC_VESSEL_CLASSES.
    """
    if force_class is not None:
        vessel_class = str(force_class)
    else:
        classes = [entry[0] for entry in SYNTHETIC_VESSEL_CLASSES]
        shares = np.array([entry[3] for entry in SYNTHETIC_VESSEL_CLASSES], dtype=float)
        vessel_class = str(rng.choice(classes, p=shares / shares.sum()))

    while True:
        mmsi = str(int(rng.integers(200_000_000, 780_000_000)))
        if mmsi not in used_mmsis:
            used_mmsis.add(mmsi)
            break

    # The name pool is finite (one prefix per class x SYNTHETIC_NAME_WORDS), so
    # large fleets run out of unused combinations. Try the pool a bounded number
    # of times, then fall back to numbering the name so any fleet size works.
    prefix = SYNTHETIC_NAME_PREFIXES[vessel_class]
    name = None
    for _attempt in range(4 * len(SYNTHETIC_NAME_WORDS)):
        candidate = f"{prefix} {rng.choice(SYNTHETIC_NAME_WORDS)}"
        if candidate not in used_names:
            name = candidate
            break
    if name is None:
        base = f"{prefix} {rng.choice(SYNTHETIC_NAME_WORDS)}"
        suffix = 2
        while f"{base} {suffix}" in used_names:
            suffix += 1
        name = f"{base} {suffix}"
    used_names.add(name)

    return mmsi, name, vessel_class


def _vessel_dimensions(rng, vessel_class):
    """Plausible (length_m, draft_m) for a vessel class."""
    if vessel_class == "tanker":
        return round(float(rng.uniform(120.0, 250.0)), 1), round(float(rng.uniform(8.0, 14.0)), 1)
    if vessel_class == "cargo":
        return round(float(rng.uniform(90.0, 200.0)), 1), round(float(rng.uniform(6.0, 12.0)), 1)
    if vessel_class == "passenger":
        return round(float(rng.uniform(60.0, 180.0)), 1), round(float(rng.uniform(4.0, 8.0)), 1)
    return round(float(rng.uniform(15.0, 40.0)), 1), round(float(rng.uniform(2.0, 5.0)), 1)


def _build_distractor_track(rng, identity, times, region_bounds, interval_minutes):
    """Build one unrelated vessel's track: a straightish transit across the region.

    The vessel starts somewhere random inside region_bounds on a random course
    and holds it, reversing course if it would leave the region so that the whole
    fleet stays inside the demo area. Some vessels sit at anchor instead, some
    make one moderate turn, and some drop out of AIS coverage briefly.

    Returns a list of AIS report dicts (one per timestamp, minus any dropped by
    a coverage gap).
    """
    mmsi, vessel_name, vessel_class = identity
    lon_min, lat_min, lon_max, lat_max = region_bounds
    _, low_sog, high_sog, _ = next(
        entry for entry in SYNTHETIC_VESSEL_CLASSES if entry[0] == vessel_class
    )
    length_m, draft_m = _vessel_dimensions(rng, vessel_class)
    step_hours = float(interval_minutes) / 60.0

    anchored = bool(rng.random() < DISTRACTOR_ANCHORED_PROBABILITY)
    base_sog = 0.1 if anchored else float(rng.uniform(low_sog, high_sog))
    course = float(rng.uniform(0.0, 360.0))

    # An optional single turn part-way through the track.
    turn_index = None
    if not anchored and rng.random() < DISTRACTOR_TURN_PROBABILITY:
        turn_index = int(rng.integers(len(times) // 4, max(len(times) // 4 + 1, 3 * len(times) // 4)))
        turn_degrees = float(rng.uniform(*DISTRACTOR_TURN_RANGE_DEG)) * rng.choice([-1.0, 1.0])

    # An optional stretch with no AIS coverage.
    dark_indices = set()
    if rng.random() < DISTRACTOR_GAP_PROBABILITY:
        dark_length = max(1, int(round(DISTRACTOR_GAP_MINUTES / float(interval_minutes))) - 1)
        dark_start = int(rng.integers(1, max(2, len(times) - dark_length - 1)))
        dark_indices = set(range(dark_start, dark_start + dark_length))

    lon = float(rng.uniform(lon_min, lon_max))
    lat = float(rng.uniform(lat_min, lat_max))
    reports = []

    for index, timestamp in enumerate(times):
        if turn_index is not None and index == turn_index:
            course = (course + turn_degrees) % 360.0

        sog = max(0.0, base_sog + float(rng.normal(0.0, 0.25)))
        if index not in dark_indices:
            reports.append(
                _ais_report(rng, mmsi, vessel_name, vessel_class, timestamp, lon, lat,
                            sog, course, length_m, draft_m, anchored)
            )

        # Advance to the next reporting position, bouncing off the region edge.
        step_km = sog * step_hours * KNOTS_TO_KM_PER_HOUR
        next_lon, next_lat = destination_point(lon, lat, course, step_km)
        if not (lon_min <= next_lon <= lon_max and lat_min <= next_lat <= lat_max):
            course = (course + 180.0) % 360.0
            next_lon, next_lat = destination_point(lon, lat, course, step_km)
        lon, lat = next_lon, next_lat

    return reports


def _ais_report(rng, mmsi, vessel_name, vessel_class, timestamp, lon, lat, sog,
                course, length_m, draft_m, anchored):
    """Assemble one synthetic AIS position report.

    Reported COG and Heading carry a little noise around the true course, and
    Heading sits a few degrees off COG, as real AIS reports do because of set and
    drift. The underlying track itself stays clean.
    """
    reported_cog = (course + float(rng.normal(0.0, 1.0))) % 360.0
    reported_heading = (course + float(rng.normal(0.0, 3.0))) % 360.0
    return {
        "MMSI": mmsi,
        "BaseDateTime": timestamp,
        "LAT": round(float(lat), 5),
        "LON": round(float(lon), 5),
        "SOG": round(float(sog), 1),
        "COG": round(reported_cog, 1),
        "Heading": round(reported_heading, 0),
        "VesselName": vessel_name,
        "VesselType": vessel_class,
        "Length": length_m,
        "Draft": draft_m,
        # 1 = at anchor, 0 = under way using engine (AIS navigation status codes).
        "Status": 1 if anchored else 0,
    }


def _build_suspect_track(rng, identity, origin_lon, origin_lat, origin_time,
                         interval_minutes):
    """Build the planted suspect's track: through the origin at the origin time.

    The track is laid out from the origin outwards, so the vessel is at exactly
    (origin_lon, origin_lat) at exactly origin_time. Positions before that are
    placed back along the inbound course; positions after it are walked forward
    step by step, because the course changes on the way out.

    Returns (reports, profile) where profile records the behaviour that was
    planted, for the notebook and README to quote.
    """
    mmsi, vessel_name, vessel_class = identity
    step = timedelta(minutes=float(interval_minutes))
    step_hours = float(interval_minutes) / 60.0
    length_m, draft_m = _vessel_dimensions(rng, vessel_class)

    approach_course = float(rng.uniform(0.0, 360.0))
    escape_course = (approach_course + SUSPECT_COURSE_CHANGE_DEG) % 360.0

    steps_before = int(round(SUSPECT_APPROACH_HOURS * 60.0 / interval_minutes))
    steps_after = int(round(SUSPECT_DEPART_HOURS * 60.0 / interval_minutes))

    # Build the schedule: for each report time, the speed and course the vessel
    # holds over the interval that starts at that time.
    schedule = []
    for index in range(-steps_before, steps_after + 1):
        hours_from_origin = index * step_hours
        if hours_from_origin < -SUSPECT_SLOWDOWN_HOURS:
            sog, course = SUSPECT_CRUISE_SOG, approach_course
        elif hours_from_origin < SUSPECT_TURN_HOURS:
            sog, course = SUSPECT_DISCHARGE_SOG, approach_course
        else:
            sog, course = SUSPECT_ESCAPE_SOG, escape_course
        schedule.append({
            "time": origin_time + index * step,
            "hours": hours_from_origin,
            "sog": sog,
            "course": course,
        })

    origin_index = steps_before  # schedule[origin_index] is the report at origin_time

    # Inbound leg: walk backwards from the origin along the reverse of the
    # inbound course, accumulating the distance still to be covered.
    schedule[origin_index]["lon"] = origin_lon
    schedule[origin_index]["lat"] = origin_lat
    distance_to_origin_km = 0.0
    reverse_course = (approach_course + 180.0) % 360.0
    for index in range(origin_index - 1, -1, -1):
        distance_to_origin_km += schedule[index]["sog"] * step_hours * KNOTS_TO_KM_PER_HOUR
        lon, lat = destination_point(origin_lon, origin_lat, reverse_course, distance_to_origin_km)
        schedule[index]["lon"] = lon
        schedule[index]["lat"] = lat

    # Outbound leg: walk forwards from the origin, since the course changes.
    for index in range(origin_index + 1, len(schedule)):
        previous = schedule[index - 1]
        step_km = previous["sog"] * step_hours * KNOTS_TO_KM_PER_HOUR
        lon, lat = destination_point(previous["lon"], previous["lat"], previous["course"], step_km)
        schedule[index]["lon"] = lon
        schedule[index]["lat"] = lat

    # Broadcast everything except the stretch where the transponder is dark.
    reports = []
    for entry in schedule:
        is_dark = -SUSPECT_DARK_START_HOURS < entry["hours"] < SUSPECT_DARK_END_HOURS
        if is_dark:
            continue
        reports.append(
            _ais_report(rng, mmsi, vessel_name, vessel_class, entry["time"],
                        entry["lon"], entry["lat"], entry["sog"], entry["course"],
                        length_m, draft_m, anchored=False)
        )

    profile = {
        "approach_course_deg": round(approach_course, 1),
        "escape_course_deg": round(escape_course, 1),
        "cruise_sog_knots": SUSPECT_CRUISE_SOG,
        "discharge_sog_knots": SUSPECT_DISCHARGE_SOG,
        "escape_sog_knots": SUSPECT_ESCAPE_SOG,
        "planted_speed_drop_knots": round(SUSPECT_CRUISE_SOG - SUSPECT_DISCHARGE_SOG, 1),
        "planted_course_change_deg": SUSPECT_COURSE_CHANGE_DEG,
        "planted_ais_gap_minutes": round(
            (SUSPECT_DARK_START_HOURS + SUSPECT_DARK_END_HOURS) * 60.0, 1
        ),
        "track_reports": len(reports),
    }
    return reports, profile


def generate_synthetic_ais_data(
    num_vessels=20,
    region_bounds=DEMO_REGION_BOUNDS,
    time_window=DEMO_AIS_TIME_WINDOW,
    true_origin=(DEMO_ORIGIN_LON, DEMO_ORIGIN_LAT),
    true_origin_time=None,
    seed=42,
    report_interval_minutes=SYNTHETIC_REPORT_INTERVAL_MINUTES,
):
    """Generate a synthetic AIS dataset with exactly one planted suspect vessel.

    Stands in for a real AIS download while one is not available, and doubles as
    the test fixture for the scoring logic: because the guilty vessel is known,
    rank_vessels() can be checked against a ground truth.

    num_vessels - 1 vessels get unrelated transits across the region. The last
    one is planted: it steams straight at true_origin, slows to a crawl, goes
    dark across true_origin_time, then reappears, turns away and accelerates.
    Distractor tracks that would stray within SYNTHETIC_MIN_DISTRACTOR_DISTANCE_KM
    of the origin are re-rolled, so the scenario has one unambiguous answer.

    Args:
        num_vessels: Total vessels, including the planted suspect. Minimum 1.
        region_bounds: (lon_min, lat_min, lon_max, lat_max) in degrees.
        time_window: (start, end) datetimes spanning the AIS history to generate.
        true_origin: (lon, lat) the planted suspect passes through.
        true_origin_time: When it passes through. Defaults to the midpoint of
            time_window. Must leave room for the vessel's inbound and outbound
            legs (SUSPECT_APPROACH_HOURS / SUSPECT_DEPART_HOURS).
        seed: Seed for numpy's default_rng, so runs are reproducible.
        report_interval_minutes: Spacing between position reports.

    Returns:
        (ais_df, ground_truth). ais_df is a cleaned DataFrame in the same shape
        load_ais_data() returns. ground_truth is a dict carrying suspect_mmsi,
        suspect_name, the true origin and time, and the planted behaviour
        profile - pass it to a test, never to the scoring functions.

    Raises:
        ValueError: if num_vessels < 1 or the time window is empty/reversed.
    """
    if num_vessels < 1:
        raise ValueError(f"num_vessels must be at least 1, got {num_vessels}")

    window_start, window_end = (pd.Timestamp(bound).to_pydatetime() for bound in time_window)
    if window_end <= window_start:
        raise ValueError(f"time_window end ({window_end}) must be after start ({window_start})")

    origin_lon, origin_lat = float(true_origin[0]), float(true_origin[1])
    if true_origin_time is None:
        true_origin_time = window_start + (window_end - window_start) / 2
    else:
        true_origin_time = pd.Timestamp(true_origin_time).to_pydatetime()

    rng = np.random.default_rng(seed)
    times = _report_times(window_start, window_end, report_interval_minutes)
    used_mmsis, used_names = set(), set()
    reports = []

    # --- The planted suspect, generated first so its identity is stable -----
    # Forced to a tanker: the vessel class this scenario is about.
    suspect_identity = _synthetic_vessel_identity(
        rng, used_mmsis, used_names, force_class="tanker"
    )
    suspect_reports, suspect_profile = _build_suspect_track(
        rng, suspect_identity, origin_lon, origin_lat, true_origin_time,
        report_interval_minutes,
    )
    reports.extend(suspect_reports)

    # --- Unrelated traffic --------------------------------------------------
    rerolls = 0
    for _ in range(num_vessels - 1):
        identity = _synthetic_vessel_identity(rng, used_mmsis, used_names)
        for attempt in range(DISTRACTOR_MAX_TRACK_ATTEMPTS):
            track = _build_distractor_track(
                rng, identity, times, region_bounds, report_interval_minutes
            )
            closest_km = float(np.min(haversine_km(
                np.array([report["LON"] for report in track]),
                np.array([report["LAT"] for report in track]),
                origin_lon, origin_lat,
            )))
            if closest_km >= SYNTHETIC_MIN_DISTRACTOR_DISTANCE_KM:
                break
            rerolls += 1
        reports.extend(track)

    ais_df = prepare_ais_dataframe(pd.DataFrame(reports), source="<synthetic>")

    ground_truth = {
        "suspect_mmsi": suspect_identity[0],
        "suspect_name": suspect_identity[1],
        "suspect_vessel_type": suspect_identity[2],
        "true_origin_lon": origin_lon,
        "true_origin_lat": origin_lat,
        "true_origin_time": true_origin_time,
        "num_vessels": num_vessels,
        "seed": seed,
        "region_bounds": tuple(region_bounds),
        "ais_time_window": (window_start, window_end),
        "report_interval_minutes": float(report_interval_minutes),
        "distractor_track_rerolls": rerolls,
        "suspect_profile": suspect_profile,
    }
    return ais_df, ground_truth


# ---------------------------------------------------------------------------
# Candidate filtering
# ---------------------------------------------------------------------------


def filter_candidate_vessels(
    ais_df,
    origin_lon,
    origin_lat,
    time_window_start,
    time_window_end,
    radius_km=DEFAULT_RADIUS_KM,
    time_buffer_hours=DEFAULT_TIME_BUFFER_HOURS,
):
    """Narrow a full AIS dataset down to the vessels worth scoring.

    A vessel qualifies if it reported at least one position within radius_km of
    the estimated origin inside the buffered time window. For every vessel that
    qualifies, all of its reports in the buffered window are returned, not just
    the ones inside the radius - the scoring step needs the whole local track to
    see speed drops, course changes and coverage gaps on the approach.

    This is the cheap filter that runs before the expensive per-vessel scoring,
    which matters because real AIS extracts run to millions of rows. Rows are
    cut down by time first, then by a bounding box, and only the survivors get an
    exact great-circle distance.

    Args:
        ais_df: Cleaned AIS DataFrame, as returned by load_ais_data().
        origin_lon, origin_lat: Estimated spill origin, in degrees.
        time_window_start, time_window_end: Estimated origin time window. Anything
            pandas can turn into a Timestamp is accepted.
        radius_km: Qualifying distance from the origin.
        time_buffer_hours: Widens the window on both sides, to absorb the
            uncertainty in Stage 2's backward-trace estimate.

    Returns:
        A DataFrame with the same columns as ais_df, holding every in-window
        report belonging to a qualifying vessel, sorted by MMSI then time. Empty
        (but with the same columns) when nothing qualifies.

    Raises:
        ValueError: if the time window is reversed.
    """
    window_start = pd.Timestamp(time_window_start)
    window_end = pd.Timestamp(time_window_end)
    if window_end < window_start:
        raise ValueError(
            f"time_window_end ({window_end}) must not be before time_window_start ({window_start})"
        )

    buffer = pd.Timedelta(hours=float(time_buffer_hours))
    buffered_start = window_start - buffer
    buffered_end = window_end + buffer

    in_window = ais_df[
        ais_df["BaseDateTime"].between(buffered_start, buffered_end)
    ]
    if in_window.empty:
        return in_window.copy()

    # Bounding-box prefilter. One degree of latitude is ~111.32 km; a degree of
    # longitude shrinks with the cosine of the latitude. The box is deliberately
    # generous - it only has to avoid running haversine over the whole dataset.
    latitude_margin = radius_km / 111.32
    cos_latitude = max(np.cos(np.radians(float(origin_lat))), 0.01)  # guard near the poles
    longitude_margin = radius_km / (111.32 * cos_latitude)

    in_box = in_window[
        in_window["LAT"].between(origin_lat - latitude_margin, origin_lat + latitude_margin)
        & in_window["LON"].between(origin_lon - longitude_margin, origin_lon + longitude_margin)
    ]
    if in_box.empty:
        return in_box.copy()

    distances_km = haversine_km(
        in_box["LON"].to_numpy(), in_box["LAT"].to_numpy(), origin_lon, origin_lat
    )
    candidate_mmsis = in_box.loc[distances_km <= float(radius_km), "MMSI"].unique()
    if len(candidate_mmsis) == 0:
        return in_box.iloc[0:0].copy()

    candidates = in_window[in_window["MMSI"].isin(candidate_mmsis)]
    return candidates.sort_values(["MMSI", "BaseDateTime"]).reset_index(drop=True)


# ---------------------------------------------------------------------------
# Scoring one vessel
# ---------------------------------------------------------------------------

# Numeric AIS vessel-type code ranges, mapped onto the classes in
# VESSEL_TYPE_SCORES. Real feeds such as marinecadastre.gov report these codes
# rather than words, so both forms have to be understood.
AIS_TYPE_CODE_RANGES = (
    (30, 30, "fishing"),
    (31, 32, "towing"),
    (33, 34, "other"),
    (35, 35, "military"),
    (36, 36, "sailing"),
    (37, 37, "pleasure"),
    (40, 49, "passenger"),  # high-speed craft, generally passenger-carrying
    (52, 52, "towing"),  # tug
    (55, 55, "military"),  # law enforcement
    (50, 59, "other"),  # remaining special craft: pilot, SAR, port tender...
    (60, 69, "passenger"),
    (70, 79, "cargo"),
    (80, 89, "tanker"),
    (90, 99, "other"),
)

# Substrings matched against a text VesselType, in priority order.
VESSEL_TYPE_KEYWORDS = (
    ("tanker", "tanker"),
    ("cargo", "cargo"),
    ("container", "cargo"),
    ("bulk", "cargo"),
    ("fishing", "fishing"),
    ("trawler", "fishing"),
    ("passenger", "passenger"),
    ("ferry", "passenger"),
    ("cruise", "passenger"),
    ("tug", "towing"),
    ("tow", "towing"),
    ("sail", "sailing"),
    ("pleasure", "pleasure"),
    ("yacht", "pleasure"),
    ("military", "military"),
    ("naval", "military"),
    ("law", "military"),
)


def normalize_vessel_type(vessel_type):
    """Map an AIS VesselType value onto one of the classes in VESSEL_TYPE_SCORES.

    Understands both numeric AIS type codes (80-89 is a tanker, 70-79 cargo, 30
    fishing, and so on - what a real feed reports) and free text ("Tanker",
    "CARGO/HAZ-A", "fishing vessel" - what most synthetic and cleaned-up datasets
    carry).

    Args:
        vessel_type: The raw VesselType cell: number, numeric string, text, or
            a missing value.

    Returns:
        A class name such as "tanker", or None when the value is missing or
        cannot be interpreted.
    """
    if vessel_type is None or (isinstance(vessel_type, float) and np.isnan(vessel_type)):
        return None
    if pd.isna(vessel_type):
        return None

    text = str(vessel_type).strip()
    if not text:
        return None

    # Numeric AIS type code, whether it arrived as a number or as "80".
    numeric = pd.to_numeric(text, errors="coerce")
    if pd.notna(numeric):
        code = int(numeric)
        for low, high, class_name in AIS_TYPE_CODE_RANGES:
            if low <= code <= high:
                return class_name
        return None

    lowered = text.lower()
    for keyword, class_name in VESSEL_TYPE_KEYWORDS:
        if keyword in lowered:
            return class_name
    return None


def _vessel_type_score(vessel_type):
    """Score a vessel class as a source of oil. Returns (score, class_name)."""
    class_name = normalize_vessel_type(vessel_type)
    if class_name is None:
        return DEFAULT_VESSEL_TYPE_SCORE, "unknown"
    return VESSEL_TYPE_SCORES.get(class_name, DEFAULT_VESSEL_TYPE_SCORE), class_name


def _proximity_score(closest_distance_km):
    """Score the closest reported approach to the origin. See PROXIMITY_* constants."""
    if closest_distance_km is None or not np.isfinite(closest_distance_km):
        return 0.0
    if closest_distance_km <= PROXIMITY_FULL_SCORE_KM:
        return 1.0
    if closest_distance_km >= PROXIMITY_ZERO_SCORE_KM:
        return 0.0
    span = PROXIMITY_ZERO_SCORE_KM - PROXIMITY_FULL_SCORE_KM
    return float((PROXIMITY_ZERO_SCORE_KM - closest_distance_km) / span)


def _effective_course(positions):
    """Best available course over ground per report, plus a label for its source.

    Prefers COG, which is what the trajectory logic actually wants. Falls back to
    Heading (where the bow points, which differs from the track under set and
    drift, but is close enough), and finally to the bearing from the previous
    reported position - derivable whenever a vessel has at least two reports.

    Args:
        positions: Time-sorted DataFrame with LON, LAT and, ideally, COG/Heading.

    Returns:
        (course_series, source_label). course_series holds degrees 0-360 with NaN
        where nothing could be established. source_label is "COG", "Heading",
        "derived from track", a combination, or "unavailable".
    """
    course = pd.Series(np.nan, index=positions.index, dtype=float)
    sources = []

    if "COG" in positions.columns and positions["COG"].notna().any():
        course = positions["COG"].astype(float)
        sources.append("COG")

    if "Heading" in positions.columns and positions["Heading"].notna().any() and course.isna().any():
        course = course.combine_first(positions["Heading"].astype(float))
        sources.append("Heading")

    if course.isna().any() and len(positions) >= 2:
        previous_lon = positions["LON"].shift()
        previous_lat = positions["LAT"].shift()
        moved = previous_lon.notna() & (
            (previous_lon != positions["LON"]) | (previous_lat != positions["LAT"])
        )
        if moved.any():
            derived = pd.Series(np.nan, index=positions.index, dtype=float)
            derived.loc[moved] = bearing_deg(
                previous_lon[moved].to_numpy(), previous_lat[moved].to_numpy(),
                positions.loc[moved, "LON"].to_numpy(), positions.loc[moved, "LAT"].to_numpy(),
            )
            # The first report has no predecessor; borrow the next one's bearing.
            derived = derived.bfill()
            before = course.isna().sum()
            course = course.combine_first(derived)
            if course.isna().sum() < before:
                sources.append("derived from track")

    return course, " + ".join(sources) if sources else "unavailable"


def _trajectory_score(positions, distances_km, course, origin_lon, origin_lat):
    """Score how well the vessel's course lines up with having run at the origin.

    Only the approach phase counts - the reports up to and including the closest
    one. After the closest approach the origin falls astern, so the bearing to it
    swings through 180 degrees and would penalise exactly the vessel that did pass
    over the spot. Reports beyond TRAJECTORY_MAX_RANGE_KM are ignored, since from
    far enough away almost any course points roughly at the origin.

    The score comes from the single best-aligned report on the approach: dead on
    scores 1.0, falling away linearly to 0.0 at TRAJECTORY_ZERO_SCORE_DEG off.

    Args:
        positions: Time-sorted DataFrame of one vessel's reports.
        distances_km: Distance from each report to the origin, aligned with positions.
        course: Effective course per report, from _effective_course().
        origin_lon, origin_lat: Estimated spill origin.

    Returns:
        (score, detail_dict).
    """
    detail = {
        "best_alignment_deg": None,
        "alignment_distance_km": None,
        "alignment_time": None,
        "approach_reports_considered": 0,
    }
    if len(positions) == 0 or course.isna().all():
        return 0.0, detail

    closest_position = int(np.argmin(distances_km))
    approach = np.arange(len(positions)) <= closest_position
    in_range = distances_km <= TRAJECTORY_MAX_RANGE_KM
    usable = approach & in_range & course.notna().to_numpy()

    if not usable.any():
        # Nothing on the approach is both close enough and has a course. Fall
        # back to the closest report on its own, if that one has a course.
        usable = np.zeros(len(positions), dtype=bool)
        usable[closest_position] = bool(course.notna().to_numpy()[closest_position])
        if not usable.any():
            return 0.0, detail

    usable_positions = positions.loc[usable]
    bearings_to_origin = bearing_deg(
        usable_positions["LON"].to_numpy(), usable_positions["LAT"].to_numpy(),
        origin_lon, origin_lat,
    )
    misalignment_deg = angular_difference_deg(course.to_numpy()[usable], bearings_to_origin)

    best = int(np.argmin(misalignment_deg))
    best_misalignment = float(misalignment_deg[best])
    score = max(0.0, 1.0 - best_misalignment / TRAJECTORY_ZERO_SCORE_DEG)

    detail = {
        "best_alignment_deg": round(best_misalignment, 2),
        "alignment_distance_km": round(float(distances_km[usable][best]), 3),
        "alignment_time": usable_positions["BaseDateTime"].iloc[best].isoformat(),
        "approach_reports_considered": int(usable.sum()),
    }
    return float(score), detail


def _anomaly_score(positions, course, time_window_start, time_window_end):
    """Score behavioural red flags around the estimated spill time.

    Three signals, weighted by ANOMALY_SUB_WEIGHTS:

      speed_drop    - a sharp, unexplained fall in SOG between consecutive
                      reports. Slowing right down is what a vessel does while it
                      discharges.
      course_change - a large course change between consecutive reports.
      ais_gap       - an unusually long silence between consecutive reports. A
                      transponder that stops broadcasting exactly over the spill
                      window is itself evidence, even though it leaves less data
                      behind to score.

    Only reports within ANOMALY_SCAN_BUFFER_HOURS of the estimated origin window
    are examined, so behaviour hours away from the spill does not count. Speed and
    course changes are only counted across intervals short enough for the change
    to have been abrupt; a 10 knot difference either side of a two-hour silence is
    not a "sharp drop".

    Args:
        positions: Time-sorted DataFrame of one vessel's reports.
        course: Effective course per report, from _effective_course().
        time_window_start, time_window_end: Estimated origin time window.

    Returns:
        (score, detail_dict) - detail carries the raw magnitude and the score for
        each of the three signals, for display in the UI.
    """
    scan_buffer = pd.Timedelta(hours=ANOMALY_SCAN_BUFFER_HOURS)
    scan_start = pd.Timestamp(time_window_start) - scan_buffer
    scan_end = pd.Timestamp(time_window_end) + scan_buffer
    in_scan = positions["BaseDateTime"].between(scan_start, scan_end).to_numpy()

    detail = {
        "speed_drop_knots": None,
        "speed_drop_score": 0.0,
        "course_change_deg": None,
        "course_change_score": 0.0,
        "max_ais_gap_minutes": None,
        "ais_gap_score": 0.0,
        "reports_in_scan_window": int(in_scan.sum()),
    }
    if in_scan.sum() < 2:
        return 0.0, detail

    scanned = positions.loc[in_scan]
    scanned_course = course.to_numpy()[in_scan]
    interval_minutes = scanned["BaseDateTime"].diff().dt.total_seconds().to_numpy() / 60.0

    # --- Sharp speed drop ---------------------------------------------------
    speed_drop_score = 0.0
    if "SOG" in scanned.columns and scanned["SOG"].notna().sum() >= 2:
        speeds = scanned["SOG"].to_numpy(dtype=float)
        drops = speeds[:-1] - speeds[1:]  # positive where the vessel slowed
        abrupt = interval_minutes[1:] <= SPEED_DROP_MAX_INTERVAL_MINUTES
        candidate_drops = np.where(abrupt & np.isfinite(drops), drops, np.nan)
        if np.isfinite(candidate_drops).any():
            largest_drop = float(np.nanmax(candidate_drops))
            if largest_drop > 0.0:
                speed_drop_score = float(np.clip(largest_drop / SPEED_DROP_FULL_SCORE_KNOTS, 0.0, 1.0))
                detail["speed_drop_knots"] = round(largest_drop, 2)
            else:
                detail["speed_drop_knots"] = 0.0
    detail["speed_drop_score"] = round(speed_drop_score, 4)

    # --- Large course change ------------------------------------------------
    course_change_score = 0.0
    if np.isfinite(scanned_course).sum() >= 2:
        changes = angular_difference_deg(scanned_course[:-1], scanned_course[1:])
        abrupt = interval_minutes[1:] <= COURSE_CHANGE_MAX_INTERVAL_MINUTES
        candidate_changes = np.where(abrupt & np.isfinite(changes), changes, np.nan)
        if np.isfinite(candidate_changes).any():
            largest_change = float(np.nanmax(candidate_changes))
            course_change_score = float(
                np.clip(largest_change / COURSE_CHANGE_FULL_SCORE_DEG, 0.0, 1.0)
            )
            detail["course_change_deg"] = round(largest_change, 2)
    detail["course_change_score"] = round(course_change_score, 4)

    # --- AIS coverage gap ---------------------------------------------------
    ais_gap_score = 0.0
    gaps = interval_minutes[1:]
    if np.isfinite(gaps).any():
        longest_gap = float(np.nanmax(gaps))
        detail["max_ais_gap_minutes"] = round(longest_gap, 1)
        gap_span = AIS_GAP_FULL_SCORE_MINUTES - AIS_GAP_MIN_MINUTES
        if gap_span > 0.0:
            ais_gap_score = float(
                np.clip((longest_gap - AIS_GAP_MIN_MINUTES) / gap_span, 0.0, 1.0)
            )
    detail["ais_gap_score"] = round(ais_gap_score, 4)

    score = (
        ANOMALY_SUB_WEIGHTS["speed_drop"] * speed_drop_score
        + ANOMALY_SUB_WEIGHTS["course_change"] * course_change_score
        + ANOMALY_SUB_WEIGHTS["ais_gap"] * ais_gap_score
    )
    return float(np.clip(score, 0.0, 1.0)), detail


def score_vessel(
    vessel_positions_df,
    origin_lon,
    origin_lat,
    time_window_start,
    time_window_end,
    weights=None,
):
    """Score one vessel as a suspect for a spill at a given place and time.

    Four independent factors are scored on 0.0-1.0 and combined into a weighted
    composite (see the WEIGHT_* constants at the top of this module):

      proximity    How close the vessel's reported track came to the origin.
      trajectory   Whether its course pointed at the origin on the approach.
      anomaly      Behavioural red flags near the spill time: a sharp speed
                   drop, a large course change, or an AIS transponder gap.
      vessel_type  Prior likelihood by ship class (a tanker outranks a yacht).

    Every sub-score and the raw magnitude behind it is returned, so a ranking
    can always be explained rather than just asserted.

    Args:
        vessel_positions_df: AIS reports for ONE vessel (one MMSI), as produced
            by filter_candidate_vessels(). Must have BaseDateTime, LAT and LON;
            SOG, COG, Heading, VesselName and VesselType are used when present.
            Does not need to be sorted - this function sorts a copy.
        origin_lon: Estimated spill origin longitude in degrees east.
        origin_lat: Estimated spill origin latitude in degrees north.
        time_window_start: Start of the estimated spill time window.
        time_window_end: End of the estimated spill time window.
        weights: Optional dict overriding DEFAULT_WEIGHTS. Keys "proximity",
            "trajectory", "anomaly", "vessel_type"; missing keys keep their
            default. Values are renormalised to sum to 1.0.

    Returns:
        A flat dict with the four sub-scores, combined_score, vessel identity,
        the supporting facts behind each sub-score, and nested "anomaly_detail"
        and "trajectory_detail" dicts. Keys are stable - the backend and the
        frontend can rely on them.
    """
    if vessel_positions_df is None or len(vessel_positions_df) == 0:
        raise ValueError("score_vessel() needs at least one AIS report")

    active_weights = dict(DEFAULT_WEIGHTS)
    if weights:
        unknown = set(weights) - set(active_weights)
        if unknown:
            raise ValueError(f"Unknown weight keys: {sorted(unknown)}")
        active_weights.update({key: float(value) for key, value in weights.items()})
    weight_total = sum(active_weights.values())
    if weight_total <= 0.0:
        raise ValueError("Scoring weights must sum to a positive number")
    active_weights = {key: value / weight_total for key, value in active_weights.items()}

    positions = vessel_positions_df.sort_values("BaseDateTime").reset_index(drop=True)

    mmsi_values = positions["MMSI"].dropna().unique() if "MMSI" in positions.columns else []
    if len(mmsi_values) > 1:
        warnings.warn(
            f"score_vessel() received {len(mmsi_values)} MMSIs in one call; "
            "it scores a single vessel. Group by MMSI first (rank_vessels does).",
            stacklevel=2,
        )

    distances_km = haversine_km(
        positions["LON"].to_numpy(dtype=float),
        positions["LAT"].to_numpy(dtype=float),
        float(origin_lon),
        float(origin_lat),
    )
    closest_position = int(np.argmin(distances_km))
    closest_distance_km = float(distances_km[closest_position])
    closest_time = positions["BaseDateTime"].iloc[closest_position]

    course, course_source = _effective_course(positions)

    proximity_score = _proximity_score(closest_distance_km)
    trajectory_score, trajectory_detail = _trajectory_score(
        positions, distances_km, course, float(origin_lon), float(origin_lat)
    )
    anomaly_score, anomaly_detail = _anomaly_score(
        positions, course, time_window_start, time_window_end
    )

    raw_vessel_type = None
    if "VesselType" in positions.columns and positions["VesselType"].notna().any():
        raw_vessel_type = positions["VesselType"].dropna().iloc[0]
    vessel_type_score, vessel_class = _vessel_type_score(raw_vessel_type)

    combined_score = (
        active_weights["proximity"] * proximity_score
        + active_weights["trajectory"] * trajectory_score
        + active_weights["anomaly"] * anomaly_score
        + active_weights["vessel_type"] * vessel_type_score
    )

    vessel_name = None
    if "VesselName" in positions.columns and positions["VesselName"].notna().any():
        vessel_name = str(positions["VesselName"].dropna().iloc[0])

    return {
        "MMSI": str(mmsi_values[0]) if len(mmsi_values) else None,
        "VesselName": vessel_name,
        "combined_score": round(float(combined_score), 4),
        "proximity_score": round(float(proximity_score), 4),
        "trajectory_score": round(float(trajectory_score), 4),
        "anomaly_score": round(float(anomaly_score), 4),
        "vessel_type_score": round(float(vessel_type_score), 4),
        "vessel_type": vessel_class,
        "vessel_type_raw": None if raw_vessel_type is None else str(raw_vessel_type),
        "closest_distance_km": round(closest_distance_km, 3),
        "closest_approach_time": closest_time.isoformat(),
        "n_positions": int(len(positions)),
        "first_report_time": positions["BaseDateTime"].iloc[0].isoformat(),
        "last_report_time": positions["BaseDateTime"].iloc[-1].isoformat(),
        "course_source": course_source,
        "trajectory_detail": trajectory_detail,
        "anomaly_detail": anomaly_detail,
        "weights_used": {key: round(value, 4) for key, value in active_weights.items()},
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def rank_vessels(
    ais_df,
    origin_lon,
    origin_lat,
    time_window_start,
    time_window_end,
    radius_km=DEFAULT_RADIUS_KM,
    time_buffer_hours=DEFAULT_TIME_BUFFER_HOURS,
    weights=None,
    max_results=None,
):
    """Rank vessels by how likely they are to have caused a spill. STAGE 3 ENTRY POINT.

    This is the function the backend calls. It takes the estimated origin and
    time window produced by Stage 2 (drift trace) and returns a ranked suspect
    list, each entry carrying the sub-scores that produced its rank.

    Pipeline: narrow the fleet with a cheap time + radius filter
    (filter_candidate_vessels), then score each surviving vessel across four
    factors (score_vessel), then sort.

    IMPORTANT: the output is a ranked list of *probabilistic* suspects, not an
    identification. A high score means "this vessel's AIS track is consistent
    with the spill", which is evidence to investigate, not proof of guilt.

    Args:
        ais_df: AIS reports as a DataFrame, or a path to a CSV file (str or
            Path) which is then read with load_ais_data(). Requires MMSI,
            BaseDateTime, LAT, LON; SOG, COG, Heading, VesselName and
            VesselType improve scoring where present.
        origin_lon: Estimated spill origin longitude in degrees east.
        origin_lat: Estimated spill origin latitude in degrees north.
        time_window_start: Start of the estimated spill window (datetime,
            pandas Timestamp, or anything pd.Timestamp() accepts).
        time_window_end: End of the estimated spill window.
        radius_km: Candidate radius around the origin. Default DEFAULT_RADIUS_KM.
        time_buffer_hours: Slack added either side of the window, absorbing
            Stage 2's timing uncertainty. Default DEFAULT_TIME_BUFFER_HOURS.
        weights: Optional factor-weight overrides, passed to score_vessel().
        max_results: Return at most this many suspects (None = all candidates).

    Returns:
        A list of dicts, highest combined_score first, ties broken by the closer
        approach. Each dict is a score_vessel() result plus a 1-based "rank".
        An empty list means no vessel was inside the filter - a real and
        reportable outcome (no AIS coverage, or nothing was nearby).

    Example:
        >>> suspects = rank_vessels(
        ...     "data/synthetic_ais_persian_gulf.csv",
        ...     origin_lon=51.50, origin_lat=26.50,
        ...     time_window_start="2026-08-26 09:00",
        ...     time_window_end="2026-08-26 15:00",
        ... )
        >>> suspects[0]["VesselName"], suspects[0]["combined_score"]
        ('MT KAVERI', 0.9406)
    """
    if isinstance(ais_df, (str, Path)):
        ais_df = load_ais_data(ais_df)
    else:
        ais_df = prepare_ais_dataframe(ais_df)

    candidates = filter_candidate_vessels(
        ais_df,
        origin_lon=origin_lon,
        origin_lat=origin_lat,
        time_window_start=time_window_start,
        time_window_end=time_window_end,
        radius_km=radius_km,
        time_buffer_hours=time_buffer_hours,
    )
    if len(candidates) == 0:
        return []

    suspects = []
    for _mmsi, vessel_positions in candidates.groupby("MMSI", sort=False):
        suspects.append(
            score_vessel(
                vessel_positions,
                origin_lon=origin_lon,
                origin_lat=origin_lat,
                time_window_start=time_window_start,
                time_window_end=time_window_end,
                weights=weights,
            )
        )

    # Highest score first; a closer approach wins a tie.
    suspects.sort(key=lambda s: (-s["combined_score"], s["closest_distance_km"]))
    for position, suspect in enumerate(suspects, start=1):
        suspect["rank"] = position

    if max_results is not None:
        suspects = suspects[: int(max_results)]
    return suspects


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------
# "python attribution.py" builds the synthetic Persian Gulf scenario, which holds
# exactly one vessel planted as the true culprit, and checks that the scoring
# ranks it first. This is the sanity check for the scoring logic: if a change to
# the weights or the sub-scores breaks the ranking, this fails loudly.


def _self_test():
    """Run the planted-suspect scenario and assert the culprit ranks first."""
    print("Stage 3 attribution self-test")
    print("=" * 72)

    ais_df, ground_truth = generate_synthetic_ais_data()
    origin_lon = ground_truth["true_origin_lon"]
    origin_lat = ground_truth["true_origin_lat"]
    window_start, window_end = DEMO_SPILL_WINDOW

    print(f"Synthetic AIS   : {len(ais_df)} reports from {ais_df['MMSI'].nunique()} vessels")
    print(f"Estimated origin: {origin_lon:.4f} E, {origin_lat:.4f} N")
    print(f"Spill window    : {window_start} to {window_end}")
    print(f"Planted culprit : {ground_truth['suspect_name']} (MMSI {ground_truth['suspect_mmsi']})")
    print()

    suspects = rank_vessels(ais_df, origin_lon, origin_lat, window_start, window_end)
    if not suspects:
        raise AssertionError("no candidate vessels were found - the filter is too tight")

    header = (
        f"{'rank':>4}  {'MMSI':<10} {'vessel':<18} {'type':<10} {'score':>6} "
        f"{'prox':>6} {'traj':>6} {'anom':>6} {'vtyp':>6} {'km':>7}"
    )
    print(header)
    print("-" * len(header))
    for suspect in suspects:
        print(
            f"{suspect['rank']:>4}  {suspect['MMSI']:<10} {str(suspect['VesselName']):<18} "
            f"{str(suspect['vessel_type']):<10} {suspect['combined_score']:6.3f} "
            f"{suspect['proximity_score']:6.3f} {suspect['trajectory_score']:6.3f} "
            f"{suspect['anomaly_score']:6.3f} {suspect['vessel_type_score']:6.3f} "
            f"{suspect['closest_distance_km']:7.2f}"
        )

    top = suspects[0]
    assert top["MMSI"] == ground_truth["suspect_mmsi"], (
        f"scoring failed: expected {ground_truth['suspect_name']} at rank 1, "
        f"got {top['VesselName']}"
    )
    runner_up = suspects[1]["combined_score"] if len(suspects) > 1 else 0.0
    print()
    print(f"PASS: {top['VesselName']} ranked #1 with {top['combined_score']:.3f}, "
          f"{top['combined_score'] - runner_up:+.3f} clear of the runner-up.")
    print("Reminder: this output is a ranked list of suspects to investigate, "
          "not an identification.")
    return suspects


if __name__ == "__main__":
    _self_test()
