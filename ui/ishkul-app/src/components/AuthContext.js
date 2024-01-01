import React, { createContext, useState, useContext } from "react";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
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
    setLastName(lastName);
    setEmail(email);
    setEmailverified(isEmailVerified);
    setLoggedInToken(token);
    setIsSignedIn(true);
  };

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
