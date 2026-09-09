import { Activity, Check, ChevronRight, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { Dashboard } from "../Dashboard";
import { ModuleViewHeader } from "../../Common/ModuleViewHeader";

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export function CoreFeaturesPage() {
  return (
    <Dashboard>
      <ModuleViewHeader
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
          ].map((item, index) => (
            <motion.div
              className="feature-list-item"
              {...fade}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              key={item}
            >
              <Check size={17} />
              <div>
                <b>{item}</b>
                <small>
                  {index % 2
                    ? "Connected and ready"
                    : "Available in your workspace"}
                </small>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Dashboard>
  );
}
