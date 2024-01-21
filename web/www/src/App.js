// @flow

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import AboutPage from "./components/AboutPage";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import IshkulHelmet from "./components/IshkulTitle";
import LandingPage from "./components/LandingPage";
import ReactGA from "react-ga";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function App() {
  // create a darkTheme function to handle dark theme using createTheme
  const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <IshkulHelmet />
        <Navbar />
        <PageTracker />
      </Router>
    </ThemeProvider>
  );
}

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (process.env.NODE_ENV !== "test") {
      ReactGA.initialize("G-E1NGLSXMG9");

      // Track page views
      const currentPage = location.pathname + location.search;
      ReactGA.pageview(currentPage);
    }
  });

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      {/* other routes */}
    </Routes>
  );
};
