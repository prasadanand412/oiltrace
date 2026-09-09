import { motion } from "framer-motion";
import { SectionHeading } from "../Common/SectionHeading";
import { capabilities } from "../../data/content";

export function Capabilities() {
  return (
    <section className="capabilities" id="capabilities">
      <SectionHeading
        eyebrow="PLATFORM CAPABILITIES"
        title="One operational picture, from detection to decision"
        text="OilTrace modernizes coastguard and maritime authority response workflows with reliable automation and composition."
      />
      <div className="cap-grid">
        {capabilities.map(([Icon, label, title, text], index) => (
          <motion.article
            className="cap-card"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -5, scale: 1.03 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.5,
              delay: index * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            key={title}
          >
            <motion.div
              className="icon-circle"
              animate={{ y: [0, -3, 0], scale: [1, 1.04, 1] }}
              transition={{
                duration: 3.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.14,
              }}
            >
              <Icon size={17} />
            </motion.div>
            <small>{label}</small>
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
