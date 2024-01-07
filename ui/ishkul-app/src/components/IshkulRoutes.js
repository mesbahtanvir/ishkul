import SignIn from "../pages/Signin.js";
import SignUp from "../pages/Signup.js";
import Profile from "./Profile.js";
import MyAccount from "../pages/MyAccount.js";
import { Routes, Route } from "react-router-dom";
import AccountRecover from "../pages/AccountRecover.js";
import Resources from "../pages/Resources.js";
import Practice from "../pages/Practice.js";
import Contribute from "./Contribute.js";
import AccountVerify from "../pages/AccountVerify.js";
import ChangePassword from "../pages/ChangePassword.js";
import HomePage from "../pages/Homepage.js";
import ReactGA from "react-ga";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ValidateEmail from "./ValidateEmail";

function IshkulRoutes() {
  return (
    <Routes>
      {/* Left Side Bar */}
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/contribute" element={<Contribute />} />

      {/* Account Management */}
      <Route path="/sign_in" element={<SignIn />} />
      <Route path="/sign_up" element={<SignUp />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/my_account" element={<MyAccount />} />
      <Route path="/account_recover" element={<AccountRecover />} />
      <Route path="/account_verify" element={<AccountVerify />} />
      <Route path="/change_password" element={<ChangePassword />} />
      <Route path="/validate_email" element={<ValidateEmail />} />
    </Routes>
  );
}

function IshkulRouterWithTracker() {
  const location = useLocation();

  useEffect(() => {
    if (process.env.NODE_ENV !== "test") {
      ReactGA.initialize("G-E1NGLSXMG9");
      // Track page views
      const currentPage = location.pathname + location.search;
      ReactGA.pageview(currentPage);
    }
  });

  return <IshkulRoutes />;
}

export default IshkulRouterWithTracker;
