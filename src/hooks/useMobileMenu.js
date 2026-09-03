import { useState } from "react";

export function useMobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const toggle = () => setOpen((current) => !current);
  return { open, close, toggle };
}
