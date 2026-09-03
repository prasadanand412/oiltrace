import { motion } from "framer-motion";
import { SectionHeading } from "../Common/SectionHeading";
import { journeySteps } from "../../data/content";

export function SimulationJourney() {
  return (
    <section className="journey band" id="journey">
      <SectionHeading
        eyebrow="SIMULATION JOURNEY"
        title="From coordinates to command briefing in under two minutes"
        text="A guided five-step flow that a duty officer can complete without advanced training."
      />
      <div className="steps">
        <motion.div
          className="timeline-progress"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        {journeySteps.map(([number, meta, title, text], index) => (
          <motion.div
            className="step"
            initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            key={number}
          >
            <motion.div
              className={`step-number${index === 2 ? " step-number-active" : ""}`}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ type: "spring", stiffness: 300, damping: 16, delay: index * 0.12 }}
            >
              {number}
            </motion.div>
            <div className="step-copy">
              <small>{meta}</small>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
