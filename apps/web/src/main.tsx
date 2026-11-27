import "./pwa/updateManager";
import "./layout/dockGap";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@inbox/ui/tokens.css";
import "./styles.css";
import { App } from "./App";
import { initI18n } from "./i18n";

initI18n();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
