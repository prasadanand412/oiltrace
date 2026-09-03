"""Stage 2 - backward drift tracing for OilTrace (SIH 2026, PS SIH26143).

Given where and when an oil spill was detected (Stage 1's output plus the
image's spatio-temporal metadata), estimate where and when the oil originated
by seeding an OpenDrift OpenOil simulation at the detection point and running
it backward through real wind and current data. This is a live physics
simulation, not a trained model.

    from model import trace_origin, get_current_wind

    wind_u, wind_v = get_current_wind(26.5, 51.5)          # (lat, lon)
    result = trace_origin(51.5, 26.5, datetime(2026, 8, 27, 12),
                          currents_file="demo_currents_persian_gulf.nc",
                          wind_u=wind_u, wind_v=wind_v)
    result["estimated_origin_lon"], result["origin_window_start"]

Public API - the backend integrates against these, signatures stay stable:

    get_current_wind(lat, lon)        OpenWeatherMap current wind -> (u, v) m/s
    get_origin_estimate(o, ...)       OpenOil result -> origin estimate
    trace_origin(...)                 STAGE 2 ENTRY POINT

Run "python model.py" for the Persian Gulf demo scenario: fetches real wind,
runs the backward trace against the cached Copernicus current file and prints
the estimated origin and time window.

Known limitation: trace_origin() accepts a release_type parameter
('instantaneous' vs 'continuous') but the current implementation does not yet
change the seeding strategy based on it.
"""

import math
import os
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import requests
from dotenv import load_dotenv
from opendrift.models.openoil import OpenOil
from opendrift.readers import reader_netCDF_CF_generic

# Cached Copernicus current field for the demo region, shipped next to this
# module: ml/drift_trace/demo_currents_persian_gulf.nc
DEFAULT_CURRENTS_FILE = Path(__file__).resolve().parent / "demo_currents_persian_gulf.nc"


# ---------------------------------------------------------------------------
# Real environmental data
# ---------------------------------------------------------------------------


def get_current_wind(lat, lon):
    """Fetch the current wind at a point from OpenWeatherMap, as (u, v) m/s.

    Meteorological wind components point where the wind is going TO, but
    OpenDrift's x_wind/y_wind expect the direction the wind blows FROM, hence
    the negated sin/cos. The API key is read from the project's .env file
    (OPENWEATHER_API_KEY) - never hardcode it.

    Args:
        lat: Latitude in degrees north.
        lon: Longitude in degrees east.

    Returns:
        (wind_u, wind_v) in m/s, ready for OpenDrift's
        environment:fallback:x_wind / y_wind.

    Raises:
        ValueError: if OPENWEATHER_API_KEY is missing or the API response
            does not contain wind data.
    """
    load_dotenv()  # reads .env file into environment variables
    api_key = os.getenv("OPENWEATHER_API_KEY")

    if not api_key:
        raise ValueError("OPENWEATHER_API_KEY not found - check your .env file")

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    )
    response = requests.get(url).json()

    if "wind" not in response:
        raise ValueError(f"API call failed or unexpected response: {response}")

    speed = response["wind"]["speed"]
    deg = response["wind"]["deg"]
    u = -speed * math.sin(math.radians(deg))
    v = -speed * math.cos(math.radians(deg))
    return u, v


# ---------------------------------------------------------------------------
# Backward-trace output extraction
# ---------------------------------------------------------------------------


def get_origin_estimate(o_backward, detection_time, trace_duration_hours=24):
    """Extract an origin estimate from a completed backward OpenOil run.

    Particles that strand on land drop out (their positions become NaN), so
    the origin is taken as the centroid of the particles still afloat at the
    last timestep that has any alive particles. If everything stranded before
    the intended trace duration, that early-stranding is reported rather than
    hidden - stranding near a coast is a valid outcome, not an error.

    Args:
        o_backward: A finished OpenOil simulation object (o.result is an
            xarray Dataset in this OpenDrift version).
        detection_time: datetime the spill was detected (the seed time).
        trace_duration_hours: Intended backward duration in hours, used only
            to detect early stranding.

    Returns:
        (origin_lon, origin_lat, origin_time, stranded_early)
    """
    lons = o_backward.result.lon.values
    lats = o_backward.result.lat.values

    last_valid_idx = -1
    for t in range(lons.shape[1] - 1, -1, -1):
        if not np.all(np.isnan(lons[:, t])):
            last_valid_idx = t
            break

    origin_lon = np.nanmean(lons[:, last_valid_idx])
    origin_lat = np.nanmean(lats[:, last_valid_idx])

    actual_hours_traced = last_valid_idx
    origin_time = detection_time - timedelta(hours=actual_hours_traced)

    return origin_lon, origin_lat, origin_time, actual_hours_traced < trace_duration_hours


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def trace_origin(detection_lon, detection_lat, detection_time, oil_type="GENERIC BUNKER C",
                 release_type="instantaneous", trace_duration_hours=24, currents_file=None,
                 wind_u=None, wind_v=None, window_buffer_hours=3):
    """Trace a detected oil spill backward to estimate its origin. STAGE 2 ENTRY POINT.

    Seeds 1000 OpenOil particles at the detection point/time and runs the
    simulation backward for trace_duration_hours, driven by a Copernicus
    current field (if given) and wind (real values recommended - see
    get_current_wind()). The centroid of the back-traced particles at the
    earliest timestep is the estimated origin.

    Args:
        detection_lon, detection_lat: Where the spill was detected, degrees.
        detection_time: datetime the spill was detected.
        oil_type: OpenDrift oil type name (affects weathering/drift).
        release_type: 'instantaneous' or 'continuous' - accepted but not yet
            used to alter the seeding (see module docstring).
        trace_duration_hours: How far back to trace.
        currents_file: Path to a netCDF current field readable by
            reader_netCDF_CF_generic. None runs with currents unset (not
            recommended for production).
        wind_u, wind_v: Wind vector in m/s (see get_current_wind()). None
            leaves wind unset (fallback-only run).
        window_buffer_hours: Half-width of the origin time window handed to
            Stage 3, absorbing estimation uncertainty.

    Returns:
        dict with:
            estimated_origin_lon, estimated_origin_lat  degrees
            estimated_origin_time                       datetime
            origin_window_start, origin_window_end      datetimes (+/- buffer)
            stranded_early                              bool
    """
    o = OpenOil(loglevel=30)

    if currents_file:
        reader = reader_netCDF_CF_generic.Reader(currents_file)
        o.add_reader([reader])

    if wind_u is not None and wind_v is not None:
        o.set_config("environment:fallback:x_wind", wind_u)
        o.set_config("environment:fallback:y_wind", wind_v)

    o.seed_elements(lon=detection_lon, lat=detection_lat, number=1000,
                    time=detection_time, oil_type=oil_type)
    o.run(duration=timedelta(hours=trace_duration_hours), time_step=3600)

    origin_lon, origin_lat, origin_time, stranded_early = get_origin_estimate(
        o, detection_time, trace_duration_hours
    )

    return {
        "estimated_origin_lon": origin_lon,
        "estimated_origin_lat": origin_lat,
        "estimated_origin_time": origin_time,
        "origin_window_start": origin_time - timedelta(hours=window_buffer_hours),
        "origin_window_end": origin_time + timedelta(hours=window_buffer_hours),
        "stranded_early": stranded_early,
    }


# ---------------------------------------------------------------------------
# Standalone demo - the Persian Gulf scenario, inference only
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    detection_lon, detection_lat = 51.5, 26.5  # central Persian Gulf, open water
    detection_time = datetime(2026, 8, 27, 12, 0, 0)  # inside the cached current file's range

    # (lat, lon) - the argument order matters; the demo point is 26.5 N, 51.5 E.
    wind_u, wind_v = get_current_wind(detection_lat, detection_lon)
    print(f"Detection   : {detection_lon} E, {detection_lat} N at {detection_time}")
    print(f"Real wind   : u={wind_u:.2f} m/s, v={wind_v:.2f} m/s")
    print(f"Currents    : {DEFAULT_CURRENTS_FILE.name}")
    print("Running 24 h backward OpenDrift trace (1000 particles)...")

    result = trace_origin(
        detection_lon, detection_lat, detection_time,
        wind_u=wind_u, wind_v=wind_v,
        currents_file=DEFAULT_CURRENTS_FILE,
    )

    print("Estimated origin:")
    print(f"  lon, lat        : {result['estimated_origin_lon']:.4f} E, {result['estimated_origin_lat']:.4f} N")
    print(f"  origin time     : {result['estimated_origin_time']}")
    print(f"  origin window   : {result['origin_window_start']}  ->  {result['origin_window_end']}")
    print(f"  stranded early  : {result['stranded_early']}")
