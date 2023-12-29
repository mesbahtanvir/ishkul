// @flow

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import AboutPage from "./components/AboutPage";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import IshkulHelmet from "./components/IshkulTitle";
import LandingPage from "./components/LandingPage";
import usePageTracking from "./components/PageTracking";

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
  usePageTracking();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      {/* other routes */}
    </Routes>
  );
};
