import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ReactGA from "react-ga";

// Create a root.
const root = createRoot(document.getElementById("root"));

ReactGA.initialize("G-E1NGLSXMG9");
ReactGA.pageview(window.location.pathname + window.location.search);

// Initial render
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
