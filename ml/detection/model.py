"""Stage 1 - SAR oil-spill detection for OilTrace (SIH 2026, PS SIH26143).

U-Net semantic segmentation of Sentinel-1 SAR imagery: single-channel grayscale
256x256 input, one oil-probability per pixel. The network was trained for 100
epochs (average IoU 0.6630 on 839 test images - see ml/results/training_results.json);
this module only defines the architecture and runs inference. It never trains.

    from model import UNet, load_model, predict_oil_spill

    model = load_model()                          # cuda if available, else cpu
    result = predict_oil_spill("image.png", model, device)
    result["oil_pixel_count"], result["oil_area_fraction"]

Public API - the backend integrates against these, signatures stay stable:

    UNet(in_channels=1, out_channels=1)      the segmentation network
    load_model(checkpoint_path, device)      trained weights -> eval-mode model
    predict_oil_spill(image_path, model, device, threshold=0.5)
                                            image -> binary mask + oil stats

Run "python model.py" for a standalone check: loads the trained checkpoint and
runs inference on one demo image from ml/detection/data/.
"""

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

# ---------------------------------------------------------------------------
# Architecture
# ---------------------------------------------------------------------------


class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.net(x)


class UNet(nn.Module):
    def __init__(self, in_channels=1, out_channels=1):
        super().__init__()
        self.enc1 = DoubleConv(in_channels, 64)
        self.enc2 = DoubleConv(64, 128)
        self.enc3 = DoubleConv(128, 256)
        self.enc4 = DoubleConv(256, 512)
        self.pool = nn.MaxPool2d(2)

        self.bottleneck = DoubleConv(512, 1024)

        self.up4 = nn.ConvTranspose2d(1024, 512, kernel_size=2, stride=2)
        self.dec4 = DoubleConv(1024, 512)
        self.up3 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
        self.dec3 = DoubleConv(512, 256)
        self.up2 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.dec2 = DoubleConv(256, 128)
        self.up1 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.dec1 = DoubleConv(128, 64)

        self.final = nn.Conv2d(64, out_channels, kernel_size=1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))

        b = self.bottleneck(self.pool(e4))

        d4 = self.up4(b)
        d4 = torch.cat([d4, e4], dim=1)
        d4 = self.dec4(d4)

        d3 = self.up3(d4)
        d3 = torch.cat([d3, e3], dim=1)
        d3 = self.dec3(d3)

        d2 = self.up2(d3)
        d2 = torch.cat([d2, e2], dim=1)
        d2 = self.dec2(d2)

        d1 = self.up1(d2)
        d1 = torch.cat([d1, e1], dim=1)
        d1 = self.dec1(d1)

        out = self.final(d1)
        return torch.sigmoid(out)


# ---------------------------------------------------------------------------
# Loading trained weights
# ---------------------------------------------------------------------------

# Default checkpoint sits next to this module: ml/detection/checkpoints/.
DEFAULT_CHECKPOINT = Path(__file__).resolve().parent / "checkpoints" / "sar_unet_best.pt"


def load_model(checkpoint_path=DEFAULT_CHECKPOINT, device=None):
    """Load the trained U-Net checkpoint onto a device, in eval mode.

    Args:
        checkpoint_path: Path to the state_dict saved by the training run.
            Defaults to the trained weights shipped with the project
            (ml/detection/checkpoints/sar_unet_best.pt).
        device: torch.device to place the model on. Defaults to CUDA when
            available, otherwise CPU.

    Returns:
        The UNet in eval mode, on the requested device.

    Raises:
        FileNotFoundError: if the checkpoint is missing or is still a ~130-byte
            Git LFS pointer file - a fresh clone needs "git lfs install &&
            git lfs pull" before inference will work.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    checkpoint_path = Path(checkpoint_path)
    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Checkpoint not found: {checkpoint_path}. Expected the trained "
            "weights at ml/detection/checkpoints/sar_unet_best.pt."
        )
    if checkpoint_path.stat().st_size < 1_000_000:
        raise FileNotFoundError(
            f"{checkpoint_path} is only {checkpoint_path.stat().st_size} bytes - "
            "it is a Git LFS pointer, not the real ~124 MB checkpoint. "
            "Run: git lfs install && git lfs pull"
        )

    model = UNet().to(device)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    model.eval()
    return model


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------


def predict_oil_spill(image_path, model, device, threshold=0.5):
    """Segment one SAR image into oil / not-oil. STAGE 1 ENTRY POINT.

    Args:
        image_path: Path to a grayscale (or any-mode, converted to grayscale)
            SAR image. The trained model expects 256x256 Sentinel-1 tiles.
        model: A UNet, as returned by load_model().
        device: torch.device the model lives on.
        threshold: Probability above which a pixel is classified as oil.

    Returns:
        dict with:
            mask              binary numpy array (1 = oil, 0 = water)
            oil_pixel_count   number of pixels classified as oil
            oil_area_fraction oil_pixel_count / total pixels
    """
    img = Image.open(image_path).convert("L")
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_tensor = torch.from_numpy(img_array).unsqueeze(0).unsqueeze(0).to(device)

    model.eval()
    with torch.no_grad():
        pred = model(img_tensor)

    binary_mask = (pred > threshold).float().squeeze().cpu().numpy()
    oil_pixel_count = int(binary_mask.sum())
    oil_area_fraction = oil_pixel_count / binary_mask.size

    return {
        "mask": binary_mask,
        "oil_pixel_count": oil_pixel_count,
        "oil_area_fraction": oil_area_fraction,
    }


# ---------------------------------------------------------------------------
# Standalone check - inference only, never training
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    demo_image = Path(__file__).resolve().parent / "data" / "test" / "sentinel" / "image" / "0.png"
    if not demo_image.exists():
        raise FileNotFoundError(
            f"Demo image not found: {demo_image}. Expected a small test-image "
            "subset under ml/detection/data/test/sentinel/image/."
        )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device    : {device}")
    print(f"Checkpoint: {DEFAULT_CHECKPOINT}")

    model = load_model(DEFAULT_CHECKPOINT, device)
    print("Loaded trained U-Net (100 epochs, avg IoU 0.6630) - inference only")

    result = predict_oil_spill(demo_image, model, device)
    print(f"Demo image: {demo_image.name}")
    print(f"Oil pixels : {result['oil_pixel_count']}")
    print(f"Oil area   : {result['oil_area_fraction']:.2%}")
