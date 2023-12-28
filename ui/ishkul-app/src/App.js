import PrimarySearchAppBar from "./components/Appbar.js";
import { AuthProvider } from "./components/AuthContext.js";
import SignIn from "./components/Signin.js";
import SignUp from "./components/Signup.js";
import { BrowserRouter, Routes, Route } from "react-router-dom";


function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
    <div className="App">
      <PrimarySearchAppBar />
      <Routes>
        <Route path="/sign_in" element={<SignIn />} />
        <Route path="/sign_up" element={<SignUp />} />
      </Routes>
    </div>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
