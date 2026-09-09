import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./store/AuthContext";
import { InvestigationProvider } from "./store/InvestigationContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InvestigationProvider><App /></InvestigationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
