import { configureStore } from "@reduxjs/toolkit";
import appStateReducer from "./app/appState";
import accountStateReduder from "./account/account";

export const store = configureStore({
  reducer: {
    appState: appStateReducer,
    accountState: accountStateReduder,
  },
  devTools: process.env.NODE_ENV !== "production", // Enable Redux DevTools only in development
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
