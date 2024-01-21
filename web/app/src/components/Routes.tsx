import { Routes, Route } from "react-router-dom";
import ReactGA from "react-ga";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import AccountPage from "../pages/AccountPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import AccountVerify from "../pages/AccountVerifyPage";
import SignupPage from "../pages/SignupPage";
import AccountRecoverPage from "../pages/AccountRecoverPage";
import ResourcesPage from "../pages/ResourcesPage";
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";
import ContributePage from "../pages/ContributePage";
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/change_password" element={<ChangePasswordPage />} />
      <Route path="/account_verify" element={<AccountVerify />} />
      <Route path="/account_recover" element={<AccountRecoverPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/resources" element={<ResourcesPage />} />
      <Route path="/contribute" element={<ContributePage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
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
