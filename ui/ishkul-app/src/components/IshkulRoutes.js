import SignIn from "./Signin.js";
import SignUp from "./Signup.js";
import Profile from "./Profile.js";
import MyAccount from "./MyAccount.js";
import { Routes, Route } from "react-router-dom";
import AccountRecover from "./AccountRecover.js";
import Resources from "./Resources.js";
import Practice from "./Practice.js";
import Contribute from "./Contribute.js";
import AccountVerify from "./AccountVerify.js";
import ChangePassword from "./ChangePassword.js";
import HomePage from "./Homepage.js";
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
    </Routes>
  );
}

export default IshkulRoutes;
