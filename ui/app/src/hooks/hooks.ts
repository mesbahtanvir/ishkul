import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store/store";
import {
  openSideBar,
  closeSideBar,
  toggleTheme,
  openAccountMenu,
  closeAccountMenu,
} from "../store/app/appState";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useToggleThemeHandler = () => {
  const dispatch: AppDispatch = useDispatch();
  return () => dispatch(toggleTheme());
};

export const useCloseSideBarHandler = (): (() => void) => {
  const dispatch: AppDispatch = useDispatch();
  return () => dispatch(closeSideBar());
};

export const useOpenSideBarHandler = (): (() => void) => {
  const dispatch: AppDispatch = useDispatch();
  return () => dispatch(openSideBar());
};

export const useOpenAccountMenuHandler = (): (() => void) => {
  const dispatch: AppDispatch = useDispatch();
  const handleOpenAccountMenu = () => {
    dispatch(openAccountMenu());
  };
  return handleOpenAccountMenu;
};

export const useCloseAccountMenuHandler = (): (() => void) => {
  const dispatch: AppDispatch = useDispatch();
  const handleCloseAccountMenu = () => {
    dispatch(closeAccountMenu());
  };
  return handleCloseAccountMenu;
};
