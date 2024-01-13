import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  ReactElement,
  FC,
} from "react";

import { decodeToken } from "react-jwt";

interface User {
  first_name: string;
  last_name: string;
  email: string;
  verified: boolean;
}

interface AuthInfo {
  token: string;
  user: User;
}

interface AuthContextType {
  authInfo: AuthInfo | null;
  storeAuthInfo: (token: string, remember: boolean) => void;
  signOut: () => void;
  getUserDetails: () => User | undefined;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);

  const storeAuthInfo = (token: string, remember: boolean) => {
    try {
      const decoded = decodeToken(token);
      if (typeof decoded === "object" && decoded !== null) {
        const userInfo: AuthInfo = { token: token, user: decoded as User };
        setAuthInfo(userInfo);
        if (remember) {
          localStorage.setItem("authInfo", JSON.stringify(userInfo));
        }
        console.log(decoded);
      }
    } catch (err) {
      console.error("Invalid token", err);
    }
  };

  useEffect(() => {
    const storedAuthInfo = localStorage.getItem("authInfo");
    if (storedAuthInfo) {
      setAuthInfo(JSON.parse(storedAuthInfo));
    }
  }, []);

  const signOut = () => {
    setAuthInfo(null);
    localStorage.removeItem("authInfo");
  };

  const getUserDetails = (): User | undefined => {
    return authInfo?.user;
  };

  return (
    <AuthContext.Provider
      value={{ storeAuthInfo, authInfo, signOut, getUserDetails }}
    >
      {children}
    </AuthContext.Provider>
  );
};
