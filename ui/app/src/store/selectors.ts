import { RootState } from "./store"; // Import the RootState type

export const selectSideBarState = (state: RootState) => state.appState.sideBar;
