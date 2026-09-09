import { createContext, useContext, useMemo, useState } from "react";

const InvestigationContext = createContext(null);

export function InvestigationProvider({ children }) {
  const [stage1Result, setStage1Result] = useState(null);
  const [backtrackResult, setBacktrackResult] = useState(null);
  const value = useMemo(
    () => ({ stage1Result, setStage1Result, backtrackResult, setBacktrackResult }),
    [stage1Result, backtrackResult],
  );
  return <InvestigationContext.Provider value={value}>{children}</InvestigationContext.Provider>;
}

// This hook is intentionally colocated with its provider to keep investigation
// state small and private to the dashboard workflow.
// eslint-disable-next-line react-refresh/only-export-components
export function useInvestigation() {
  const context = useContext(InvestigationContext);
  if (!context) throw new Error("useInvestigation must be used inside InvestigationProvider.");
  return context;
}
