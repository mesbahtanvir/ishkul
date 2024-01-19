import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AccountState {
  isLoggedIn: boolean;
  email: string;
  token: string;
  firstName: string;
  lastName: string;
}
const initialState: AccountState = {
  isLoggedIn: false,
  email: "",
  token: "",
  firstName: "",
  lastName: "",
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
    },
  },
});
export const { login } = accountStateSlice.actions;
export default accountStateSlice.reducer;
