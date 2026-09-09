import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  Clock3,
  FileText,
  Gauge,
  MapPinned,
  Navigation,
  Route,
  Satellite,
  ShieldCheck,
  Waves,
  Wind,
} from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { useRef, useState } from "react";
import { SectionHeading } from "../Common/SectionHeading";
import { journeySteps } from "../../data/content";

const stepDetails = [
  { icon: MapPinned, badge: "Live Data", visual: "map" },
  { icon: Gauge, badge: "20 Seconds", visual: "form" },
  { icon: BrainCircuit, badge: "AI Powered", visual: "prediction" },
  { icon: Route, badge: "GIS", visual: "trajectory" },
  { icon: FileText, badge: "72 Hour Forecast", visual: "report" },
];

function JourneyVisual({ type }) {
  if (type === "map")
    return (
      <div className="journey-visual journey-map-visual">
        <div className="journey-map-grid" />
        <span className="journey-map-coast" />
        <span className="journey-map-route" />
        <motion.span
          className="journey-map-pin"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <MapPinned size={16} />
        </motion.span>
        <span className="journey-map-label">Gulf of Khambhat</span>
        <span className="journey-map-coordinates">21.64° N · 72.54° E</span>
        <span className="journey-map-control">
          <Navigation size={12} />
        </span>
      </div>
    );
  if (type === "form")
    return (
      <div className="journey-visual journey-form-visual">
        <div className="journey-form-head">
          <span>SPILL PARAMETERS</span>
          <Satellite size={14} />
        </div>
        <div className="journey-form-row">
          <span>API gravity</span>
          <b>
            28.4 <em>°API</em>
          </b>
        </div>
        <div className="journey-form-row">
          <span>Estimated volume</span>
          <b>
            120 <em>m³</em>
          </b>
        </div>
        <div className="journey-form-row">
          <span>Wind speed</span>
          <b>
            14 <em>kn</em>
          </b>
        </div>
        <div className="journey-form-footer">
          <span>
            <i /> Auto-estimate ready
          </span>
          <Wind size={13} />
        </div>
      </div>
    );
  if (type === "prediction")
    return (
      <div className="journey-visual journey-prediction-visual">
        <div className="journey-prediction-head">
          <span>ENSEMBLE PREDICTION</span>
          <b>72H</b>
        </div>
        <div className="journey-chart">
          <span className="journey-chart-y y-one">40</span>
          <span className="journey-chart-y y-two">20</span>
          <motion.svg
            viewBox="0 0 260 94"
            preserveAspectRatio="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1 }}
          >
            <path
              className="journey-chart-area"
              d="M0 72 C36 61 48 65 78 45 S125 51 151 31 S205 42 260 12 V94 H0Z"
            />
            <path
              className="journey-chart-line"
              d="M0 72 C36 61 48 65 78 45 S125 51 151 31 S205 42 260 12"
            />
          </motion.svg>
        </div>
        <div className="journey-prediction-foot">
          <span>
            <i /> Confidence band
          </span>
          <b>
            <Activity size={12} /> 89.4%
          </b>
        </div>
      </div>
    );
  if (type === "trajectory")
    return (
      <div className="journey-visual journey-trajectory-visual">
        <div className="journey-map-grid" />
        <span className="journey-trajectory-land" />
        <span className="journey-trajectory-spread spread-one" />
        <span className="journey-trajectory-spread spread-two" />
        <motion.span
          className="journey-trajectory-dot"
          animate={{ offsetDistance: ["0%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <span className="journey-trajectory-legend">
          <i /> Forecast track <i /> Sensitive zone
        </span>
        <span className="journey-trajectory-tag">+18.6 km²</span>
      </div>
    );
  return (
    <div className="journey-visual journey-report-visual">
      <div className="journey-report-top">
        <span>
          <FileText size={14} /> INCIDENT BRIEFING
        </span>
        <small>PDF</small>
      </div>
      <div className="journey-report-title">
        <b>OSI-2418</b>
        <span>Gulf of Khambhat</span>
      </div>
      <div className="journey-report-lines">
        <i />
        <i />
        <i />
      </div>
      <div className="journey-report-stats">
        <span>
          <b>HIGH</b>Risk index
        </span>
        <span>
          <b>18.6</b>km² affected
        </span>
        <span>
          <b>72h</b>Forecast
        </span>
      </div>
      <div className="journey-report-footer">
        <ShieldCheck size={13} /> Ready for command briefing <ArrowRight size={13} />
      </div>
    </div>
  );
}

export function SimulationJourney() {
  const journeyRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const { scrollYProgress } = useScroll({
    target: journeyRef,
    offset: ["start 72%", "end 36%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.25,
  });
  useMotionValueEvent(scrollYProgress, "change", (latest) =>
    setActiveStep(Math.min(4, Math.max(0, Math.floor(latest * 5)))),
  );
  return (
    <section className="journey journey-premium band" id="journey" ref={journeyRef}>
      <div className="journey-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <SectionHeading
        eyebrow="SIMULATION JOURNEY"
        title="From coordinates to command briefing, see every decision take shape"
        text="A guided five-step flow that a duty officer can complete without advanced training."
      />
      <div className="journey-intro-meta">
        <span>
          <Waves size={14} /> COASTAL RESPONSE WORKFLOW
        </span>
        <span>
          LIVE SYSTEM STATUS <i />
        </span>
      </div>
      <div className="journey-timeline">
        <div className="journey-track" aria-hidden="true">
          <motion.div className="journey-track-fill" style={{ scaleY: progress }} />
        </div>
        {journeySteps.map(([number, meta, title, text], index) => {
          const detail = stepDetails[index];
          const Icon = detail.icon;
          const isCurrent = activeStep === index;
          const isComplete = activeStep > index;
          return (
            <motion.article
              className={`journey-step journey-step-${index % 2 === 0 ? "left" : "right"}${isCurrent ? " is-current" : ""}${isComplete ? " is-complete" : ""}`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -42 : 42 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              key={number}
            >
              <div className="journey-step-node" aria-label={`Step ${number}`}>
                {isComplete ? (
                  <Check size={17} strokeWidth={3} />
                ) : (
                  <span>{number}</span>
                )}
              </div>
              <div className="journey-card">
                <div className="journey-card-visual">
                  <JourneyVisual type={detail.visual} />
                  <span className="journey-card-sheen" />
                </div>
                <div className="journey-card-content">
                  <div className="journey-card-top">
                    <span className="journey-step-icon">
                      <Icon size={16} />
                    </span>
                    <span className="journey-step-meta">{meta}</span>
                    <span className="journey-step-badge">{detail.badge}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <div className="journey-card-footer">
                    <span>
                      <Clock3 size={13} /> {meta.split("·")[1]?.trim()}
                    </span>
                    <span className="journey-status">
                      {isComplete ? "Complete" : isCurrent ? "In progress" : "Queued"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
