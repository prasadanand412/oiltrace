import { useState } from "react";
import { Layers } from "lucide-react";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";
import { MapSurface } from "../../Common/MapSurface";

export function GISCommandMapPage() {
  const [layer, setLayer] = useState("All layers");
  return (
    <Dashboard>
      <ModuleViewHeader
        eyebrow="GEOSPATIAL OPERATIONS"
        title="GIS command map"
        text="Layered spatial context for faster, safer decisions."
        action={
          <button className="module-action">
            <Layers size={16} /> Manage layers
          </button>
        }
      />
      <MapSurface layer={layer} onLayerChange={setLayer} />
    </Dashboard>
  );
}
