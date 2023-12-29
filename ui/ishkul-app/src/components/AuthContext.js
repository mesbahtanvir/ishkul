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

  const storeSignedInData = (firstName, lastName, email, token) => {
    setFirstName(firstName);
    setLastName(lastName);
    setEmail(email);
    setLoggedInToken(token);
    setIsSignedIn(true);
  };

  const signOut = () => {
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
        storeSignedInData,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
