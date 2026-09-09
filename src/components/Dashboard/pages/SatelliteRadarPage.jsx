import { useState } from "react";
import { LoaderCircle, Radar, Upload } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";
import { apiRequest } from "../../../services/api";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/tiff"]);

function validateImage(file) {
  if (!file) return "Select a SAR image to analyze.";
  if (!ACCEPTED_TYPES.has(file.type)) return "Upload a PNG, JPEG, or TIFF SAR image.";
  if (file.size > MAX_SIZE) return "The image must be 10 MB or smaller.";
  return null;
}

export function SatelliteRadarPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    setStatus("idle");
  }

  function chooseImage(event) {
    const file = event.target.files?.[0];
    const validationError = validateImage(file);
    if (validationError) {
      clearImage();
      setError(validationError);
      return;
    }
    if (file.type === "image/tiff") {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl("");
      setResult(null);
      setError("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        if (image.width !== 256 || image.height !== 256) {
          clearImage();
          setError("Stage 1 requires a 256 × 256 Sentinel-1 SAR tile.");
          return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError("");
      };
      image.onerror = () => {
        clearImage();
        setError("The uploaded file is not a valid image.");
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function analyzeImage() {
    const validationError = validateImage(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStatus("processing");
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      const response = await apiRequest("/sar/analyze", { method: "POST", body: formData });
      setResult(response.result);
      setStatus("complete");
    } catch (requestError) {
      setStatus("idle");
      setError(requestError.message || "The SAR model could not analyze this image.");
    }
  }

  return (
    <Dashboard>
      <ModuleViewHeader
        eyebrow="REMOTE SENSING / SAR"
        title="Satellite radar review"
        text="Upload a validated Sentinel-1 tile to run the OilTrace segmentation model."
        action={
          <button className="module-action" onClick={analyzeImage} disabled={!selectedFile || status === "processing"}>
            {status === "processing" ? <LoaderCircle className="spin" size={16} /> : <Radar size={16} />}
            {status === "processing" ? "Analyzing scene" : "Analyze scene"}
          </button>
        }
      />
      <div className="sar-analysis-layout">
        <section className="sar-upload-panel">
          <input id="sar-image-input" className="sar-file-input" type="file" accept=".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff" onChange={chooseImage} />
          {previewUrl ? (
            <div className="sar-preview-wrap">
              <img src={previewUrl} alt="Selected SAR scene" />
              <button type="button" onClick={clearImage}>Change image</button>
            </div>
          ) : (
            <label className="sar-drop-zone" htmlFor="sar-image-input">
              <Upload size={26} />
              <b>Choose a SAR image</b>
              <span>PNG, JPEG, or TIFF · 256 × 256 · up to 10 MB</span>
            </label>
          )}
          {selectedFile && <p className="sar-file-name">{selectedFile.name}</p>}
          {error && <p className="sar-error">{error}</p>}
        </section>
        <aside className="sar-result-panel">
          <small>STAGE 1 / DETECTION RESULT</small>
          {status === "processing" ? (
            <div className="sar-empty-state"><LoaderCircle className="spin" size={23} /><span>Model is analyzing the SAR tile…</span></div>
          ) : result ? (
            <>
              <img className="sar-mask" src={`data:image/png;base64,${result.mask_png_base64}`} alt="Predicted oil-spill mask" />
              <div className="sar-metric"><span>Oil coverage</span><b>{(result.oil_area_fraction * 100).toFixed(2)}%</b></div>
              <div className="sar-metric"><span>Detected oil pixels</span><b>{result.oil_pixel_count.toLocaleString()}</b></div>
              <p className="sar-complete">Analysis complete. The mask shows the predicted slick extent.</p>
            </>
          ) : (
            <div className="sar-empty-state"><Radar size={24} /><span>Select a 256 × 256 tile, then start analysis to view the model output.</span></div>
          )}
        </aside>
      </div>
    </Dashboard>
  );
}
