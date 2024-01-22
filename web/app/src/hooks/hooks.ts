import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store/store";
import {
  openSideBar,
  closeSideBar,
  toggleTheme,
  openAccountMenu,
  closeAccountMenu,
  updateBottomNavbar,
} from "../store/app/appState";
import { login, logout } from "../store/account/account";
import {
  setCurrentPage,
  storeDocument,
  storeDocuments,
} from "../store/resources/resources";
import { DocumentNoUrl, GetDocumentResponse, Document } from "../models/model";
import {
  clearContributeDocument,
  storeContributeDocuments,
} from "../store/contribute/contribute";
import { BottomNavbar } from "../models/enum";

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

export const useUpdateBottonNavHandler = (): ((
  value: BottomNavbar
) => void) => {
  const dispatch: AppDispatch = useDispatch();
  return (value: BottomNavbar) =>
    dispatch(updateBottomNavbar({ value: value }));
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

export const useStoreDocumentsHandler = (): ((
  documents: DocumentNoUrl[]
) => void) => {
  const dispatch: AppDispatch = useDispatch();
  return (documents: DocumentNoUrl[]) =>
    dispatch(storeDocuments({ documents: documents }));
};

export const useStoreDocumentHandler = (): ((
  document: GetDocumentResponse
) => void) => {
  const dispatch: AppDispatch = useDispatch();
  return (document: GetDocumentResponse) =>
    dispatch(storeDocument({ document: document }));
};

export const useSetCurrentPageHandler = (): ((currentPage: number) => void) => {
  const dispatch: AppDispatch = useDispatch();
  return (currentPage: number) =>
    dispatch(setCurrentPage({ currentPage: currentPage }));
};

export const useStoreContributeDocumentHandler = (): ((
  documents: Document[]
) => void) => {
  const dispatch: AppDispatch = useDispatch();
  return (documents: Document[]) =>
    dispatch(storeContributeDocuments({ documents: documents }));
};

export const useClearContributeDocumentHandler = (): (() => void) => {
  const dispatch: AppDispatch = useDispatch();
  return () => dispatch(clearContributeDocument());
};
