import { createSlice } from "@reduxjs/toolkit";

interface AppState {
  accountMenu: string;
  sideBar: string;
  theme: string;
}
const initialState: AppState = {
  accountMenu: "close",
  sideBar: "close",
  theme: "dark",
};
export const appStateSlice = createSlice({
  name: "appState",
  initialState,
  reducers: {
    openAccountMenu: (state) => {
      state.accountMenu = "open";
      state.sideBar = "close";
    },
    closeAccountMenu: (state) => {
      state.accountMenu = "close";
    },
    openSideBar: (state) => {
      state.sideBar = "open";
      state.accountMenu = "close";
    },
    closeSideBar: (state) => {
      state.sideBar = "close";
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "dark" ? "light" : "dark";
    },
  },
});
export const {
  openAccountMenu,
  closeAccountMenu,
  openSideBar,
  closeSideBar,
  toggleTheme,
} = appStateSlice.actions;
export default appStateSlice.reducer;
