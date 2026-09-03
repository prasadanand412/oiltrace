import { motion } from "framer-motion";
import { SectionHeading } from "../Common/SectionHeading";
import { technology } from "../../data/content";

export function Technology() {
  return (
    <section className="technology" id="technology">
      <SectionHeading
        eyebrow="TECHNOLOGY"
        title="A stack chosen for accuracy, speed and auditability"
        text="Engineered to satisfy reproducibility criteria required by coastal safety administrations."
      />
      <div className="tech-grid">
        {technology.map(([Icon, title, text], index) => (
          <motion.article
            className="tech-card"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.03 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            key={title}
          >
            <motion.div
              className="icon-circle"
              animate={{ y: [0, -3, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.14 }}
            >
              <Icon size={17} />
            </motion.div>
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
