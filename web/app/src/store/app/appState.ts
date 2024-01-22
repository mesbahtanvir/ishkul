import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BottomNavbar } from "../../models/enum";

interface AppState {
  accountMenu: string;
  sideBar: string;
  theme: string;
  bottomNavbar: BottomNavbar;
}

const initialState: AppState = {
  accountMenu: "close",
  sideBar: "close",
  theme: "dark",
  bottomNavbar: BottomNavbar.Upload,
};

interface BottomNavbarPayload {
  value: BottomNavbar;
}

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
    updateBottomNavbar: (state, action: PayloadAction<BottomNavbarPayload>) => {
      state.bottomNavbar = action.payload.value;
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
  updateBottomNavbar,
} = appStateSlice.actions;
export default appStateSlice.reducer;
