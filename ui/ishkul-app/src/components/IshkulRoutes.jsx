import SignIn from "./Signin.jsx";
import SignUp from "./Signup.jsx";
import Profile from "./Profile.jsx";
import MyAccount from "./MyAccount.jsx";
import { Routes, Route } from "react-router-dom";
import AccountRecover from "./AccountRecover.jsx";
import Resources from "./Resources.js";
import Practice from "./Practice.js";
import Contribute from "./Contribute.js";

function IshkulRoutes() {
  return (
    <Routes>
      <Route path="/sign_in" element={<SignIn />} />
      <Route path="/sign_up" element={<SignUp />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/my_account" element={<MyAccount />} />
      <Route path="/account_recover" element={<AccountRecover />} />
      <Route path="/resource" element={<Resources />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/contribute" element={<Contribute />} />
    </Routes>
  );
}

export default IshkulRoutes;
