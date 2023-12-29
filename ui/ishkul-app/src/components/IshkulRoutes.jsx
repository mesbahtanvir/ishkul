
import SignIn from "./Signin.jsx";
import SignUp from "./Signup.jsx";
import Profile from "./Profile.jsx";
import MyAccount from "./MyAccount.jsx";

import { Routes, Route } from "react-router-dom";
import AccountRecover from "./AccountRecover.jsx";

function IshkulRoutes() {
    return (
      <Routes>
        <Route path="/sign_in" element={<SignIn />} />
        <Route path="/sign_up" element={<SignUp />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my_account" element={<MyAccount/>} />
        <Route path="/account_recover" element={<AccountRecover/>}/>
      </Routes>
    )
  }

  export default IshkulRoutes;