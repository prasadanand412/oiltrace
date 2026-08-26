import { motion } from "framer-motion";
import { SectionHeading } from "../Common/SectionHeading";
import { reveal, technology } from "../../data/content";

export function Technology() {
  return (
    <section className="technology" id="technology">
      <SectionHeading
        eyebrow="TECHNOLOGY"
        title="A stack chosen for accuracy, speed and auditability"
        text="Engineered to satisfy reproducibility criteria required by coastal safety administrations."
      />
      <div className="tech-grid">
        {technology.map(([Icon, title, text]) => (
          <motion.article className="tech-card" {...reveal} key={title}>
            <div className="icon-circle">
              <Icon size={17} />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
