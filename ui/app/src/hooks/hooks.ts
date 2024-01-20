import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store/store";
import {
  openSideBar,
  closeSideBar,
  toggleTheme,
  openAccountMenu,
  closeAccountMenu,
} from "../store/app/appState";
import { login, logout } from "../store/account/account";

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
  return () => dispatch(openAccountMenu());
};

export const useCloseAccountMenuHandler = (): (() => void) => {
  const dispatch: AppDispatch = useDispatch();
  return () => dispatch(closeAccountMenu());
};

export const useLoginHandler = (): ((token: string) => void) => {
  const dispatch: AppDispatch = useDispatch();
  return (token: string) => dispatch(login({ token: token }));
};

export const useLogoutHandler = (): (() => void) => {
  const dispatch: AppDispatch = useDispatch();
  return () => dispatch(logout());
};
