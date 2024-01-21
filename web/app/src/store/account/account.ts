import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../../models/model";
import { ParseToken } from "../../lib/token";

interface AccountState {
  isLoggedIn: boolean;
  token: string;
  user: User;
}
const initialState: AccountState = {
  isLoggedIn: false,
  token: "",
  user: {
    id: "",
    first_name: "",
    last_name: "",
    email: "",
    verified: false,
    is_admin: false,
  },
};

// Define a type for the payload of the openAccountMenu action
interface LoginPayload {
  token: string;
}

export const accountStateSlice = createSlice({
  name: "accountState",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      state.token = action.payload.token;
      state.isLoggedIn = true;
      state.user = ParseToken(state.token);
    },
    logout: (state) => {
      state.token = "";
      state.isLoggedIn = false;
      state.user = {
        id: "",
        first_name: "",
        last_name: "",
        email: "",
        verified: false,
        is_admin: false,
      };
    },
  },
});
export const { login, logout } = accountStateSlice.actions;
export default accountStateSlice.reducer;
