import { motion } from "framer-motion";
import { SectionHeading } from "../Common/SectionHeading";
import { capabilities, reveal } from "../../data/content";

export function Capabilities() {
  return (
    <section className="capabilities" id="capabilities">
      <SectionHeading
        eyebrow="PLATFORM CAPABILITIES"
        title="One operational picture, from detection to decision"
        text="OilTrace modernizes coastguard and maritime authority response workflows with reliable automation and composition."
      />
      <div className="cap-grid">
        {capabilities.map(([Icon, label, title, text]) => (
          <motion.article className="cap-card" {...reveal} key={title}>
            <div className="icon-circle">
              <Icon size={17} />
            </div>
            <small>{label}</small>
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
