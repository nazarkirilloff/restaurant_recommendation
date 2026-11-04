// Must run first: installs the Trusted Types policy the CSP requires.
import "./security/trustedTypes";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n/I18n";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
