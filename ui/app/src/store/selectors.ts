import { RootState } from "./store"; // Import the RootState type

export const selectSideBarState = (state: RootState) => state.appState.sideBar;
export const selectAccountMenuState = (state: RootState) =>
  state.appState.accountMenu;
export const selectAccountLoginState = (state: RootState) =>
  state.accountState.isLoggedIn;
export const selectAccountState = (state: RootState) => state.accountState;
