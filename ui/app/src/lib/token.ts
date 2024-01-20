import { decodeToken } from "react-jwt";

import { User } from "./../models/model";

const ParseToken = (token: string): User => {
  try {
    const decoded = decodeToken(token);
    if (typeof decoded === "object" && decoded !== null) {
      const user: User = decoded as User;
      return user;
    }
  } catch (err) {
    console.error("Invalid token", err);
  }
  return {} as User;
};

export { ParseToken };
