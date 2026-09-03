"""Project-relative filesystem paths for OilTrace.

Notebooks and scripts import this module instead of hard-coding absolute paths,
so the project runs unchanged no matter where the repository is cloned. Every
path below is a plain pathlib.Path built from ROOT, the folder holding this file.

    import oiltrace_paths as paths
    paths.MODEL_BEST        ->  <ROOT>/ml/detection/checkpoints/sar_unet_best.pt
    paths.SENTINEL_TEST_IMG ->  <ROOT>/dataset/test/sentinel/image

Run "python oiltrace_paths.py" to print every path and whether it exists.
"""

import os
from pathlib import Path

# --- Project root -----------------------------------------------------------

ROOT = Path(__file__).resolve().parent

# --- Model weights (checkpoints/*.pt tracked with Git LFS) ------------------

MODELS_DIR = ROOT / "ml" / "detection" / "checkpoints"
MODEL_BEST = MODELS_DIR / "sar_unet_best.pt"

# --- Dataset ----------------------------------------------------------------
# Defaults to <ROOT>/dataset. The dataset is not committed to git, so set
# OILTRACE_DATASET to use a copy kept outside the project:
#     PowerShell:  $env:OILTRACE_DATASET = "D:/data/deep-sar-sos"
#     bash:        export OILTRACE_DATASET=/data/deep-sar-sos

DATASET_DIR = Path(os.environ.get("OILTRACE_DATASET", ROOT / "dataset")).expanduser()

SENTINEL_TRAIN_IMG = DATASET_DIR / "train" / "sentinel" / "image"
SENTINEL_TRAIN_LABEL = DATASET_DIR / "train" / "sentinel" / "label"
SENTINEL_TEST_IMG = DATASET_DIR / "test" / "sentinel" / "image"
SENTINEL_TEST_LABEL = DATASET_DIR / "test" / "sentinel" / "label"

# --- Outputs ----------------------------------------------------------------

RESULTS_JSON = ROOT / "ml" / "results" / "training_results.json"

# --- Self-check -------------------------------------------------------------

if __name__ == "__main__":
    for _name, _path in list(globals().items()):
        if isinstance(_path, Path):
            print(f"{_name:<22}{_path}  {'OK' if _path.exists() else 'MISSING'}")
