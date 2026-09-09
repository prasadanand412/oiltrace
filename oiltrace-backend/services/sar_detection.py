"""FastAPI-facing adapter for the ML team's Stage 1 SAR detector."""

import base64
import io
import os
import sys
from pathlib import Path

from PIL import Image


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
ML_ROOT = BACKEND_ROOT / "ml" if (BACKEND_ROOT / "ml").is_dir() else REPOSITORY_ROOT / "ml"
if str(ML_ROOT.parent) not in sys.path:
    sys.path.insert(0, str(ML_ROOT.parent))

class PipelineUnavailableError(RuntimeError):
    """Raised when the optional ML runtime or model weights are unavailable."""


_model = None
_device = None


def _model_path() -> Path:
    configured_path = os.getenv("OILTRACE_SAR_MODEL_PATH")
    if configured_path:
        return Path(configured_path).expanduser()
    return ML_ROOT / "detection" / "checkpoints" / "sar_unet_best.pt"


def _get_model():
    global _model, _device
    if _model is None:
        try:
            import torch
            from ml.detection.model import load_model

            _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            _model = load_model(_model_path(), _device)
        except (ImportError, FileNotFoundError, OSError, RuntimeError) as exc:
            raise PipelineUnavailableError(str(exc)) from exc
    return _model, _device


def analyze_image(image_path: Path) -> dict:
    """Return a JSON-safe Stage 1 result, including a PNG mask preview."""
    model, device = _get_model()
    try:
        from ml.detection.model import predict_oil_spill

        result = predict_oil_spill(image_path, model, device)
        mask_image = Image.fromarray((result["mask"] * 255).astype("uint8"), mode="L")
        buffer = io.BytesIO()
        mask_image.save(buffer, format="PNG")
    except (OSError, RuntimeError, ValueError) as exc:
        raise PipelineUnavailableError("The SAR model could not process this image.") from exc

    return {
        "oil_pixel_count": result["oil_pixel_count"],
        "oil_area_fraction": result["oil_area_fraction"],
        "mask_png_base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
        "model_input": "256x256 grayscale Sentinel-1 SAR tile",
    }
