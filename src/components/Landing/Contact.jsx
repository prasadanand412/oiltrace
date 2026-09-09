import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { reveal } from "../../data/content";

export function Contact() {
  return (
    <section className="cta" id="contact">
      <motion.div {...reveal}>
        <h2>Ready to Protect Our Oceans?</h2>
        <p>
          Deploy OilTrace into your coastal command center. Reach out today to
          schedule an on-site simulation briefing with our specialists.
        </p>
        <div>
          <Link to="/signup" className="button button-white">
            Request Demo
          </Link>
          <Link to="/signin" className="button button-ghost">
            Start Simulation <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
