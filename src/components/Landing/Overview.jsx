import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { animationEase, reveal, stats } from "../../data/content";
import { SectionHeading } from "../Common/SectionHeading";

// Hero content and challenge metrics share the overview section.
function Hero() {
  return (
    <section className="hero-section" id="overview">
      <div className="hero-grid" />
      <motion.div
        className="hero-copy"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: animationEase }}
      >
        <div className="status-pill">
          <span />
          SIH 2026{" "}
          <em>AI oil spill trajectory intelligence for coastal agencies</em>
        </div>
        <h1>
          Predict. Visualize.
          <br />
          <b>Protect.</b>
        </h1>
        <p>
          OilTrace fuses satellite observation, live met-ocean feeds and machine
          learning to forecast how a marine oil spill will travel — so response
          teams can deploy booms, skimmers and crews hours before the slick
          reaches shore.
        </p>
        <div className="hero-actions">
          <Link to="/signin" className="button button-blue">
            Launch Platform <ArrowRight size={18} />
          </Link>
          <a href="#journey" className="button button-outline">
            See how a simulation runs
          </a>
        </div>
      </motion.div>
      <div className="hero-map">
        <div className="map-dots" />
        <div className="map-wave map-wave-one" />
        <div className="map-wave map-wave-two" />
        <span className="map-point point-one" />
        <span className="map-point point-two" />
        <span className="map-point point-three" />
      </div>
    </section>
  );
}
function Challenge() {
  return (
    <section className="challenge band">
      <SectionHeading
        eyebrow="THE CHALLENGE"
        title="Marine spills move faster than the agencies responding to them"
        text="Roughly 700,000 tonnes of oil enter the ocean every year.
     The bottleneck is rarely equipment — it is knowing where the oil will be next."
      />
      <div className="stat-grid">
        {stats.map(([Icon, stat, label, title, text]) => (
          <motion.article className="stat-card" {...reveal} key={title}>
            <div className="icon-circle">
              <Icon size={17} />
            </div>
            <div className="stat-number">
              {stat}
              <small>{label}</small>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
export function Overview() {
  return (
    <>
      <Hero />
      <Challenge />
    </>
  );
}
