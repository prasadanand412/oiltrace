"""Stage 1 SAR oil-spill detection model supplied by the ML pipeline.

The public inference API is ``load_model`` and ``predict_oil_spill``.  This
module is intentionally kept independent of FastAPI so it can also be used by
the pipeline notebooks and command-line checks.
"""

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image


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
        d4 = self.dec4(torch.cat([self.up4(b), e4], dim=1))
        d3 = self.dec3(torch.cat([self.up3(d4), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))
        return torch.sigmoid(self.final(d1))


DEFAULT_CHECKPOINT = Path(__file__).resolve().parent / "checkpoints" / "sar_unet_best.pt"


def load_model(checkpoint_path=DEFAULT_CHECKPOINT, device=None):
    """Load the trained U-Net checkpoint into eval mode."""
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    checkpoint_path = Path(checkpoint_path)
    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Checkpoint not found: {checkpoint_path}. Set OILTRACE_SAR_MODEL_PATH "
            "or place the trained file at ml/detection/checkpoints/sar_unet_best.pt."
        )
    if checkpoint_path.stat().st_size < 1_000_000:
        raise FileNotFoundError(
            f"{checkpoint_path} is a Git LFS pointer, not the trained checkpoint. "
            "Run: git lfs install && git lfs pull"
        )

    model = UNet().to(device)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    model.eval()
    return model


def predict_oil_spill(image_path, model, device, threshold=0.5):
    """Run the ML pipeline's Stage 1 inference for one SAR image path."""
    img = Image.open(image_path).convert("L")
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_tensor = torch.from_numpy(img_array).unsqueeze(0).unsqueeze(0).to(device)

    model.eval()
    with torch.no_grad():
        prediction = model(img_tensor)

    binary_mask = (prediction > threshold).float().squeeze().cpu().numpy()
    oil_pixel_count = int(binary_mask.sum())
    return {
        "mask": binary_mask,
        "oil_pixel_count": oil_pixel_count,
        "oil_area_fraction": oil_pixel_count / binary_mask.size,
    }
