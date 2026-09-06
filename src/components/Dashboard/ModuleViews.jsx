import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Check,
  ChevronRight,
  Download,
  Filter,
  LoaderCircle,
  Layers,
  Play,
  Radar,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Upload,
  UserRound,
} from "lucide-react";
import { UserManagementPage } from "./pages/UserManagementPage";

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export function ModuleView({ module }) {
  const views = {
    "Core Features": <FeatureView />,
    "AI Simulation": <SimulationView />,
    "GIS Command Map": <MapView title="GIS command map" />,
    "Incident Workflow": <WorkflowView />,
    "Satellite Radar SAR": <SarView />,
    "Sensitive Coastal Zones": (
      <MapView title="Sensitive coastal zones" />
    ),
    "Historical Archives": <ArchivesView />,
    "Analytics & Reports": <AnalyticsView />,
    "Alerts & Notifications": <AlertsView />,
    "User Management": <UserManagementPage />,
    Settings: <SettingsView />,
    Profile: <ProfileView />,
  };

  return views[module] ?? <FeatureView />;
}

function ViewHeader({ eyebrow, title, text, action }) {
  return (
    <motion.div className="module-view-header" {...fade}>
      <div>
        <span className="module-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </motion.div>
  );
}

function FeatureView() {
  return (
    <>
      <ViewHeader
        eyebrow="PLATFORM / CORE FEATURES"
        title="Tools built for decisive response"
        text="Compose the operational picture around the way your team works."
        action={
          <button className="module-action">
            <SlidersHorizontal size={16} /> Configure
          </button>
        }
      />

      <div className="feature-showcase">
        <div className="feature-focus">
          <span className="module-icon">
            <Activity size={24} />
          </span>
          <small>RECOMMENDED</small>
          <h2>Operational intelligence</h2>
          <p>
            Bring satellite detection, met-ocean context and response readiness
            into one auditable workflow.
          </p>
          <button className="module-action">
            Explore capability <ChevronRight size={16} />
          </button>
        </div>

        <div className="feature-list-grid">
          {[
            "AI trajectory prediction",
            "Composable map layers",
            "Agency-ready reporting",
            "Met-ocean ingestion",
          ].map((item, i) => (
            <motion.div
              className="feature-list-item"
              {...fade}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              key={item}
            >
              <Check size={17} />
              <div>
                <b>{item}</b>
                <small>
                  {i % 2
                    ? "Connected and ready"
                    : "Available in your workspace"}
                </small>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}

function SimulationView() {
  const [running, setRunning] = useState(false);

  return (
    <>
      <ViewHeader
        eyebrow="AI ENGINE / SIMULATION"
        title="Model a possible future"
        text="Set release conditions and watch the ensemble forecast take shape."
        action={
          <button
            className="module-action"
            onClick={() => setRunning(!running)}
          >
            {running ? <RotateCcw size={16} /> : <Play size={16} />}
            {running ? "Reset run" : "Run simulation"}
          </button>
        }
      />

      <div className="simulation-layout">
        <div className="control-panel">
          <h2>Simulation setup</h2>

          {[
            ["Release volume", "420 m³"],
            ["API gravity", "0.84"],
            ["Wind speed", "18 knots"],
            ["Forecast horizon", "72 hours"],
          ].map(([label, value]) => (
            <label key={label}>
              <span>
                {label}
                <b>{value}</b>
              </span>
              <input type="range" defaultValue="62" />
            </label>
          ))}

          <div className="simulation-toggle">
            <span>Include sensitive zones</span>
            <ToggleRight size={24} />
          </div>
        </div>

        <div
          className={`simulation-canvas${running ? " is-running" : ""}`}
        >
          <div className="sim-grid" />
          <span className="sim-source">RELEASE POINT</span>
          <i className="sim-plume" />
          <i className="sim-track" />

          <div className="sim-timeline">
            <span>00h</span>
            <b />
            <span>72h</span>
          </div>
        </div>

        <div className="result-panel">
          <small>ENSEMBLE RESULT</small>
          <strong>
            {running ? "94.8" : "--"}
            <em>%</em>
          </strong>
          <span>Confidence score</span>
          <hr />
          <b>12 members</b>
          <p>Forecast uncertainty narrows after the first 18 hours.</p>
        </div>
      </div>
    </>
  );
}

function MapView({ title }) {
  const [layer, setLayer] = useState("All layers");

  return (
    <>
      <ViewHeader
        eyebrow="GEOSPATIAL OPERATIONS"
        title={title}
        text="Layered spatial context for faster, safer decisions."
        action={
          <button className="module-action">
            <Layers size={16} /> Manage layers
          </button>
        }
      />

      <div className="full-map-view">
        <div className="map-toolbar">
          {["All layers", "Incidents", "Sensitivity", "Assets"].map(
            (item) => (
              <button
                className={layer === item ? "active" : ""}
                onClick={() => setLayer(item)}
                key={item}
              >
                {item}
              </button>
            )
          )}
        </div>

        <div
          className={`map-heat layer-${layer
            .toLowerCase()
            .replace(" ", "-")}`}
        />

        <div className="map-rings">
          <i />
          <i />
          <i />
        </div>

        <div className="map-control">
          <button aria-label="Zoom in">+</button>
          <button aria-label="Zoom out">−</button>
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
    </>
  );
}

function WorkflowView() {
  const steps = [
    ["Detection triaged", "Sentinel-1A pass verified", true],
    ["Incident classified", "Severity assigned by duty officer", true],
    ["Response deployed", "Boom team en route to Hazira", true],
    ["Shoreline sign-off", "Awaiting field confirmation", false],
  ];

  return (
    <>
      <ViewHeader
        eyebrow="OPERATIONS / WORKFLOW"
        title="Incident response workflow"
        text="Track ownership and operational progress from detection to closure."
        action={
          <button className="module-action">
            <Upload size={16} /> Export brief
          </button>
        }
      />

      <div className="workflow-panel">
        {steps.map(([title, text, done], i) => (
          <motion.div
            className={`workflow-step${done ? " done" : ""}`}
            {...fade}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            key={title}
          >
            <div className="workflow-node">
              {done ? <Check size={15} /> : i + 1}
            </div>

            <div>
              <small>STEP 0{i + 1}</small>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>

            <span>{done ? "Complete" : "In progress"}</span>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function SarView() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/tiff'].includes(file.type)) {
      setError("Choose a PNG, JPEG, or TIFF SAR image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The image must be 10 MB or smaller.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    const dimensions = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve([image.width, image.height]);
      image.onerror = () => resolve(null);
      image.src = imageUrl;
    });

    if (!dimensions || dimensions[0] !== 256 || dimensions[1] !== 256) {
      URL.revokeObjectURL(imageUrl);
      setError("Stage 1 requires a 256 × 256 Sentinel-1 SAR tile.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(imageUrl);
    setResult(null);
    setError("");
    setStatus("ready");
  }

  function clearImage() {
    setSelectedFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    setStatus("idle");
  }

  async function analyzeImage() {
    if (!selectedFile || status === "processing") return;

    setStatus("processing");
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"}/sar/analyze`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "The SAR image could not be analyzed.");
      }
      setResult(data.result);
      setStatus("completed");
    } catch (requestError) {
      setStatus("ready");
      setError(requestError.message || "Unable to reach the analysis service.");
    }
  }

  return (
    <>
      <ViewHeader
        eyebrow="REMOTE SENSING / SAR"
        title="SAR oil-spill detection"
        text="Submit a calibrated Sentinel-1 tile to the Stage 1 detection model."
        action={
          <button
            className="module-action"
            onClick={analyzeImage}
            disabled={!selectedFile || status === "processing"}
          >
            {status === "processing" ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />}
            {status === "processing" ? "Analyzing scene" : "Analyze image"}
          </button>
        }
      />

      <div className="sar-analysis-layout">
        <section className="sar-upload-panel">
          <input
            id="sar-image-input"
            className="sar-file-input"
            type="file"
            accept=".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff"
            onChange={chooseImage}
          />
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
              <p className="sar-complete">Analysis complete. The yellow area in the mask is the predicted slick extent.</p>
            </>
          ) : (
            <div className="sar-empty-state"><Radar size={24} /><span>Select an image, then start analysis to view the model output.</span></div>
          )}
        </aside>
      </div>
    </>
  );
}

function ArchivesView() {
  const [query, setQuery] = useState("");

  const records = [
    ["OSI-2388", "Kochi harbour", "12 Aug 2026", "Contained"],
    ["OSI-2374", "Mundra coast", "04 Aug 2026", "Resolved"],
    ["OSI-2351", "Paradip port", "28 Jul 2026", "Monitored"],
  ];

  const filtered = records.filter((row) =>
    row.join(" ").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <ViewHeader
        eyebrow="RECORDS / ARCHIVES"
        title="Historical incident archive"
        text="Search completed incidents, simulations and agency briefings."
        action={
          <button className="module-action">
            <Download size={16} /> Export records
          </button>
        }
      />

      <div className="archive-panel">
        <div className="archive-tools">
          <div>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search incident ID or location"
            />
          </div>

          <button>
            <Filter size={15} /> Filters
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Incident</th>
              <th>Location</th>
              <th>Closed</th>
              <th>Outcome</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {filtered.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td
                    key={cell}
                    className={i === 3 ? "status-cell" : ""}
                  >
                    {cell}
                  </td>
                ))}
                <td>
                  <ChevronRight size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AnalyticsView() {
  return (
    <>
      <ViewHeader
        eyebrow="INTELLIGENCE / REPORTS"
        title="Analytics & reports"
        text="Understand monitoring coverage, response velocity and model performance."
        action={
          <button className="module-action">
            <Download size={16} /> Download report
          </button>
        }
      />

      <div className="analytics-view-grid">
        <div className="analytics-hero-card">
          <small>MONITORING COVERAGE</small>
          <strong>94.8%</strong>
          <span>+4.2% vs previous period</span>

          <svg
            viewBox="0 0 600 180"
            preserveAspectRatio="none"
          >
            <path d="M0 145 C55 125 70 95 125 112 S200 120 245 86 S320 105 365 58 S430 80 470 62 S540 74 600 22" />
          </svg>
        </div>

        <div className="report-list">
          <h2>Recent reports</h2>

          {[
            "Weekly operational brief",
            "Model accuracy review",
            "Coastal exposure report",
          ].map((x, i) => (
            <div key={x}>
              <span>
                <Download size={15} />
              </span>

              <b>
                {x}
                <small>
                  {i + 1} day{i ? "s" : ""} ago
                </small>
              </b>

              <ChevronRight size={15} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AlertsView() {
  const [ack, setAck] = useState([]);

  const alerts = [
    [
      "Tier 3 active",
      "OSI-2418 forecast shoreline contact inside 15 hours",
      "High",
    ],
    [
      "SAR detection ready",
      "New candidate detected near Gulf of Khambhat",
      "Medium",
    ],
    [
      "Asset status changed",
      "GEOSENCE GF-02 has reached exclusion zone",
      "Low",
    ],
  ];

  return (
    <>
      <ViewHeader
        eyebrow="OPERATIONS / ALERTS"
        title="Alerts & notifications"
        text="Stay ahead of the changes that need an operational response."
        action={
          <button className="module-action">
            <Check size={16} /> Mark all read
          </button>
        }
      />

      <div className="alert-view-panel">
        {alerts.map(([title, text, level]) => (
          <div
            className={`alert-row ${
              ack.includes(title) ? "acknowledged" : ""
            }`}
            key={title}
          >
            <i className={`alert-level ${level.toLowerCase()}`} />

            <div>
              <b>{title}</b>
              <p>{text}</p>
              <small>Today · 06:22 UTC</small>
            </div>

            <button
              onClick={() => setAck([...ack, title])}
            >
              {ack.includes(title)
                ? "Acknowledged"
                : "Acknowledge"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function SettingsView() {
  const [tab, setTab] = useState("Workspace");
  const [enabled, setEnabled] = useState({});

  return (
    <>
      <ViewHeader
        eyebrow="ACCOUNT / SETTINGS"
        title="Workspace settings"
        text="Manage preferences and connections for your command workspace."
      />

      <div className="settings-layout">
        <nav>
          {[
            "Workspace",
            "Notifications",
            "Data connections",
            "Security",
          ].map((x) => (
            <button
              className={tab === x ? "active" : ""}
              onClick={() => setTab(x)}
              key={x}
            >
              {x}
            </button>
          ))}
        </nav>

        <div className="settings-panel">
          <h2>{tab} preferences</h2>
          <p>
            Configure {tab.toLowerCase()} for your operational team.
          </p>

          {[
            "Email incident summaries",
            "Real-time SAR alerts",
            "Weekly model performance digest",
          ].map((x) => (
            <button
              className="settings-toggle"
              onClick={() =>
                setEnabled({
                  ...enabled,
                  [x]: !enabled[x],
                })
              }
              key={x}
            >
              <span>
                {x}
                <small>
                  Keep your team informed about important changes.
                </small>
              </span>

              {enabled[x] ? (
                <ToggleRight size={24} />
              ) : (
                <ToggleLeft size={24} />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ProfileView() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("You are not logged in.");
        return;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8001/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load profile."
          );
        }

        setUser(data);
      } catch (err) {
        setError(
          err.message || "Unable to load profile."
        );
      }
    }

    loadProfile();
  }, []);

  return (
    <>
      <ViewHeader
        eyebrow="ACCOUNT / PROFILE"
        title="Commander profile"
        text="Manage your identity, role and account security."
        action={
          <button className="module-action">
            <UserRound size={16} /> Edit profile
          </button>
        }
      />

      <div className="profile-layout">
        <div className="profile-card">
          <span>
            {user?.username
              ? user.username.substring(0, 2).toUpperCase()
              : "—"}
          </span>

          <h2>
            {user?.username ||
              (error ? "Unable to load" : "Loading...")}
          </h2>

          <p>Incident Commander</p>

          <small>OilTrace Platform User</small>

          <button className="module-action">
            Manage access
          </button>
        </div>

        <div className="activity-panel">
          <h2>Recent account activity</h2>

          {error ? (
            <div>
              <i />
              <span>
                <b>{error}</b>
              </span>
            </div>
          ) : (
            <>
              {[
                "Signed in from a trusted device",
                "Exported OSI-2418 incident brief",
                "Updated notification preferences",
              ].map((x, i) => (
                <div key={x}>
                  <i />

                  <span>
                    <b>{x}</b>
                    <small>
                      {i + 1} hour{i ? "s" : ""} ago
                    </small>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
