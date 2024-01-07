import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import ReactGA from "react-ga";

const root = ReactDOM.createRoot(document.getElementById("root"));

ReactGA.initialize("G-E1NGLSXMG9");
ReactGA.pageview(window.location.pathname + window.location.search);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
