import { motion } from "framer-motion";
import { reveal } from "../../data/content";

export function Eyebrow({ children }) {
  return (
    <div className="eyebrow">
      <span />
      {children}
    </div>
  );
}
export function SectionHeading({ eyebrow, title, text, viewport, wordReveal = false }) {
  return (
    <motion.div
      className="section-heading"
      {...reveal}
      viewport={viewport ?? reveal.viewport}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className={wordReveal ? "section-heading-words" : ""}>
        {wordReveal
          ? title
              .split(" ")
              .map((word, index) => <span key={`${word}-${index}`}>{word} </span>)
          : title}
      </h2>
      {text && <p>{text}</p>}
    </motion.div>
  );
}
