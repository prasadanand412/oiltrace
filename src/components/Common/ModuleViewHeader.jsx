import { motion } from "framer-motion";

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export function ModuleViewHeader({ eyebrow, title, text, action }) {
  return (
    <motion.div className="module-view-header" {...fade}>
      <div>
        <span className="module-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </motion.div>
  );
}
