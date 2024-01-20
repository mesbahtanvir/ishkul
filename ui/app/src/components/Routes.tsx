import { Routes, Route } from "react-router-dom";
import ReactGA from "react-ga";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import AccountPage from "../pages/AccountPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account" element={<AccountPage />} />
    </Routes>
  );
}

function RoutesWithTracker() {
  const location = useLocation();
  useEffect(() => {
    if (process.env.NODE_ENV !== "test") {
      ReactGA.initialize("G-E1NGLSXMG9");
      const currentPage = location.pathname + location.search;
      ReactGA.pageview(currentPage);
    }
  });
  return <AppRoutes />;
}

export default RoutesWithTracker;
