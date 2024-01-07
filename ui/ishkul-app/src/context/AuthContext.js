import React, { createContext, useState, useContext, useEffect } from "react";

import Cookies from "js-cookie";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // TODO refactor this to make it readable and maintainable
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loggedInToken, setLoggedInToken] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailverified] = useState("");

  const storeSignedInData = (
    firstName,
    lastName,
    email,
    isEmailVerified,
    token
  ) => {
    setFirstName(firstName);
    Cookies.set("firstName", JSON.stringify(firstName), { expires: 1 });
    setLastName(lastName);
    Cookies.set("lastName", JSON.stringify(lastName), { expires: 1 });
    setEmail(email);
    Cookies.set("email", JSON.stringify(email), { expires: 1 });
    setEmailverified(isEmailVerified);
    Cookies.set("isEmailVerified", JSON.stringify(isEmailVerified), {
      expires: 1,
    });
    setLoggedInToken(token);
    Cookies.set("token", JSON.stringify(token), {
      expires: 1,
    });
    setIsSignedIn(true);
    Cookies.set("isSignedIn", JSON.stringify(true), {
      expires: 1,
    });
  };

  useEffect(() => {
    console.log("read from coockie");
    const firstName = Cookies.get("firstName");
    console.log(firstName);
    if (firstName) {
      setFirstName(JSON.parse(firstName));
    }
    const lastName = Cookies.get("lastName");
    if (lastName) {
      setLastName(JSON.parse(lastName));
    }
    const email = Cookies.get("email");
    if (email) {
      setEmail(JSON.parse(email));
    }
    const isEmailVerified = Cookies.get("isEmailVerified");
    if (isEmailVerified) {
      setEmailverified(JSON.parse(isEmailVerified));
    }
    const token = Cookies.get("token");
    if (token) {
      setLoggedInToken(JSON.parse(token));
    }
    const isSignedIn = Cookies.get("isSignedIn");
    console.log(isSignedIn);
    if (isSignedIn) {
      setIsSignedIn(JSON.parse(isSignedIn));
    }
  }, []);

  const signOut = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setEmailverified(false);
    setLoggedInToken("");
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        loggedInToken,
        firstName,
        lastName,
        email,
        emailVerified,
        storeSignedInData,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
