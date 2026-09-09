import { useState } from "react";

const layers = ["All layers", "Incidents", "Sensitivity", "Assets"];

export function MapSurface({ layer, onLayerChange }) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="full-map-view">
      <div className="map-toolbar">
        {layers.map((item) => (
          <button
            className={layer === item ? "active" : ""}
            onClick={() => onLayerChange(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="map-zoom-layer" style={{ transform: `scale(${zoom})` }}>
        <div className={`map-heat layer-${layer.toLowerCase().replace(" ", "-")}`} />
        <div className="map-rings">
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="map-control">
        <button
          onClick={() => setZoom((current) => Math.min(current + 0.1, 1.5))}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoom((current) => Math.max(current - 0.1, 0.8))}
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
      <div className="map-key">
        <b>ACTIVE LAYER · {layer.toUpperCase()}</b>
        <span>
          <i className="key-red" /> High risk
        </span>
        <span>
          <i className="key-amber" /> Watch zone
        </span>
        <span>
          <i className="key-blue" /> Response asset
        </span>
      </div>
    </div>
  );
}
