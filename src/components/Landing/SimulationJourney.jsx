import { motion } from "framer-motion";
import { SectionHeading } from "../Common/SectionHeading";
import { journeySteps, reveal } from "../../data/content";

export function SimulationJourney() {
  return (
    <section className="journey band" id="journey">
      <SectionHeading
        eyebrow="SIMULATION JOURNEY"
        title="From coordinates to command briefing in under two minutes"
        text="A guided five-step flow that a duty officer can complete without advanced training."
      />
      <div className="steps">
        {journeySteps.map(([number, meta, title, text]) => (
          <motion.div className="step" {...reveal} key={number}>
            <div className="step-copy">
              <small>{meta}</small>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
            <div className="step-number">{number}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
