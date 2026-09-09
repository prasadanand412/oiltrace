import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { animationEase, stats } from "../../data/content";
import { SectionHeading } from "../Common/SectionHeading";

// Hero content and challenge metrics share the overview section.
function Hero() {
  const { scrollY } = useScroll();
  const mapY = useTransform(scrollY, [0, 700], [0, -36]);
  const waveY = useTransform(scrollY, [0, 700], [0, 18]);
  const particles = [
    [18, 22, 0], [31, 64, 1.2], [47, 16, .6], [65, 72, 1.8],
    [79, 31, .9], [88, 61, 1.5],
  ];

  return (
    <section className="hero-section" id="overview">
      <div className="hero-grid" />
      <motion.div
        className="hero-copy"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div className="status-pill" variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: .4, ease: animationEase }}>
          <span />
          SIH 2026{" "}
          <em>AI oil spill trajectory intelligence for coastal agencies</em>
        </motion.div>
        <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: .5, ease: animationEase }}>
          Predict. Visualize.
          <br />
          <b>Protect.</b>
        </motion.h1>
        <motion.p variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: .45, ease: animationEase }}>
          OilTrace fuses satellite observation, live met-ocean feeds and machine
          learning to forecast how a marine oil spill will travel — so response
          teams can deploy booms, skimmers and crews hours before the slick
          reaches shore.
        </motion.p>
        <motion.div className="hero-actions" variants={{ hidden: { opacity: 0, scale: .96 }, visible: { opacity: 1, scale: 1 } }} transition={{ duration: .3, ease: animationEase }}>
          <Link to="/signin" className="button button-blue hero-primary-button">
            Start Simulation <ArrowRight size={18} />
          </Link>
          <a href="#journey" className="button button-outline">
            See how a simulation runs
          </a>
        </motion.div>
      </motion.div>
      <motion.div className="hero-map" style={{ y: mapY }}>
        <div className="map-dots" />
        <motion.div className="map-wave map-wave-one" style={{ y: waveY }} />
        <motion.div className="map-wave map-wave-two" style={{ y: waveY }} />
        <motion.span className="map-point point-one" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        <motion.span className="map-point point-two" animate={{ y: [0, 7, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: .8 }} />
        <motion.span className="map-point point-three" animate={{ y: [0, -6, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }} />
        {particles.map(([left, top, delay]) => <span className="hero-particle" style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }} key={`${left}-${top}`} />)}
      </motion.div>
    </section>
  );
}
function AnimatedStat({ value }) {
  const numericValue = Number(value.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
  const valueRef = useRef(null);
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / 1200, 1);
        const eased = 1 - (1 - progress) ** 3;
        const nextValue = numericValue % 1 ? (numericValue * eased).toFixed(1) : Math.round(numericValue * eased);
        setDisplayValue(String(nextValue));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      observer.disconnect();
    }, { rootMargin: "-80px 0px", threshold: 0.15 });
    if (valueRef.current) observer.observe(valueRef.current);
    return () => observer.disconnect();
  }, [numericValue]);

  const prefix = value.match(/^[^\d]*/)?.[0] ?? "";
  const suffix = value.replace(/^[^\d]*\d+(?:\.\d+)?/, "");
  return <span ref={valueRef}>{prefix}{displayValue}{suffix}</span>;
}

function Challenge() {
  return (
    <section className="challenge band">
      <SectionHeading
        eyebrow="THE CHALLENGE"
        title="Marine spills move faster than the agencies responding to them"
        viewport={{ once: true, margin: "-80px" }}
        text="Roughly 700,000 tonnes of oil enter the ocean every year.
     The bottleneck is rarely equipment — it is knowing where the oil will be next."
      />
      <div className="stat-grid">
        {stats.map(([Icon, stat, label, title, text], index) => (
          <motion.article
            className={`stat-card${index === 0 ? " stat-card-active" : ""}`}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.03 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            key={title}
          >
            <motion.div
              className="icon-circle"
              animate={{ y: [0, -3, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }}
            >
              <Icon size={17} />
            </motion.div>
            <div className="stat-number">
              <AnimatedStat value={stat} />
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
